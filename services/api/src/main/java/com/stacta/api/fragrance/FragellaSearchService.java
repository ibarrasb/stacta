package com.stacta.api.fragrance;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.fragrance.dto.FragranceRatingSummary;
import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.integrations.fragella.FragellaClient;
import com.stacta.api.integrations.fragella.FragellaDtos;
import com.stacta.api.upload.UploadImageUrlResolver;
import com.stacta.api.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class FragellaSearchService {
  private static final Logger log = LoggerFactory.getLogger(FragellaSearchService.class);

  private final FragellaClient client;
  private final FragellaMapper mapper;
  private final FragellaSearchCacheService cacheService;
  private final ObjectMapper objectMapper;

  // for persisted detail
  private final FragranceRepository fragranceRepository;
  private final UserRepository userRepository;
  private final FragranceRatingService ratingService;
  private final UploadImageUrlResolver imageUrlResolver;
  private static final double FRAGELLA_RATING_PRIOR_WEIGHT = 220.0;

  public FragellaSearchService(
    FragellaClient client,
    FragellaMapper mapper,
    FragellaSearchCacheService cacheService,
    ObjectMapper objectMapper,
    FragranceRepository fragranceRepository,
    UserRepository userRepository,
    FragranceRatingService ratingService,
    UploadImageUrlResolver imageUrlResolver
  ) {
    this.client = client;
    this.mapper = mapper;
    this.cacheService = cacheService;
    this.objectMapper = objectMapper;
    this.fragranceRepository = fragranceRepository;
    this.userRepository = userRepository;
    this.ratingService = ratingService;
    this.imageUrlResolver = imageUrlResolver;
  }

  public List<FragranceSearchResult> searchCached(String q, int limit) {
    try {
      String json = cacheService.searchJson(q, limit);
      return objectMapper.readValue(json, new TypeReference<List<FragranceSearchResult>>() {});
    } catch (Exception e) {
      throw new RuntimeException("Failed to parse cached Fragella search JSON", e);
    }
  }

  public List<FragellaDtos.Fragrance> searchRaw(String q, int limit) {
    return client.search(q, limit);
  }

  public List<FragranceSearchResult> mapRaw(List<FragellaDtos.Fragrance> raw) {
    return mapper.mapRaw(raw);
  }

  /**
   * Detail resolver used by:
   * GET /api/v1/fragrances/{externalId}?source=FRAGELLA|COMMUNITY
   *
   * Reads from DB by (external_source, external_id), parses snapshot, returns FragranceSearchResult.
   *
   * NOTE:
   * Search no longer persists FRAGELLA fragrances. So for FRAGELLA, if not found in DB,
   * we fall back to a live Fragella lookup by externalId (brand|name|year) and return it
   * WITHOUT persisting a fragrance row.
   */
  public FragranceSearchResult getPersistedDetail(String source, String externalId) {
    String src = (source == null ? "FRAGELLA" : source.trim()).toUpperCase(Locale.ROOT);
    String ext = normalizeExternalId(externalId);

    // tolerate both styles in DB ("FRAGELLA"/"fragella", "COMMUNITY"/"community")
    List<String> candidates = switch (src) {
      case "COMMUNITY" -> List.of("COMMUNITY", "community");
      case "FRAGELLA" -> List.of("FRAGELLA", "fragella");
      default -> List.of(src, src.toLowerCase(Locale.ROOT));
    };

    Optional<Fragrance> found = Optional.empty();
    for (String c : candidates) {
      found = fragranceRepository.findByExternalSourceAndExternalId(c, ext);
      if (found.isPresent()) break;
    }

    // If not found in DB and this is FRAGELLA, fall back to live lookup
    if (found.isEmpty()) {
      if ("FRAGELLA".equalsIgnoreCase(src)) {
        FragellaDtos.Fragrance live = fetchLiveFragellaByExternalId(ext);
        if (live == null) {
          throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fragrance not found");
        }

        List<FragranceSearchResult> mapped = mapper.mapRaw(List.of(live));
        if (mapped != null && !mapped.isEmpty()) {
          return withIds(mapped.get(0), "fragella", ext, null, null, null);
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fragrance not found");
      }

      // COMMUNITY (or other sources) must exist in DB
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fragrance not found");
    }

    Fragrance entity = found.get();
    String snapshot = entity.getSnapshot();
    if (snapshot == null || snapshot.isBlank()) snapshot = "{}";

    // what the FE expects as source string
    String responseSource =
      "COMMUNITY".equalsIgnoreCase(entity.getExternalSource()) ? "community" : "fragella";

    // COMMUNITY snapshots are persisted as FragranceSearchResult; parsing them as Fragella DTO can yield null-heavy results.
    if ("community".equalsIgnoreCase(responseSource)) {
      try {
        FragranceSearchResult parsed = objectMapper.readValue(snapshot, FragranceSearchResult.class);
        return withIds(parsed, responseSource, entity.getExternalId(), entity.getCreatedByUserId(), parsed.createdByUsername(), null);
      } catch (Exception e) {
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Snapshot parse failed");
      }
    }

    // 1) Try parse snapshot as Fragella DTO (typical for ingested FRAGELLA rows)
    try {
      FragellaDtos.Fragrance dto = objectMapper.readValue(snapshot, FragellaDtos.Fragrance.class);
      List<FragranceSearchResult> mapped = mapper.mapRaw(List.of(dto));
      if (mapped != null && !mapped.isEmpty()) {
        return withIds(mapped.get(0), responseSource, entity.getExternalId(), entity.getCreatedByUserId(), null, null);
      }
    } catch (Exception ignore) {
      // fallthrough
    }

    // 2) Try parse snapshot already as FragranceSearchResult (good for COMMUNITY)
    try {
      FragranceSearchResult parsed = objectMapper.readValue(snapshot, FragranceSearchResult.class);
      return withIds(parsed, responseSource, entity.getExternalId(), entity.getCreatedByUserId(), parsed.createdByUsername(), null);
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Snapshot parse failed");
    }
  }

  /**
   * Best-effort live lookup from Fragella when a FRAGELLA fragrance is not persisted in our DB.
   * externalId is expected to be: "brand|name|year" (lowercased, spaces normalized).
   */
  private FragellaDtos.Fragrance fetchLiveFragellaByExternalId(String externalId) {
    if (externalId == null || externalId.isBlank()) return null;

    String brand = "";
    String name = "";
    String year = "";

    String[] parts = externalId.split("\\|", -1);
    if (parts.length >= 2) {
      brand = parts[0].trim();
      name = parts[1].trim();
      if (parts.length >= 3) year = parts[2].trim();
    } else {
      // if it doesn't match expected format, just try searching by the whole string
      name = externalId.trim();
    }

    // Try "brand name" first for better precision
    String q1 = (brand.isBlank() ? "" : brand + " ") + name;
    FragellaDtos.Fragrance hit = findExactByExternalId(q1.trim(), externalId);
    if (hit != null) return hit;

    // Fallback: search by name only
    if (!name.isBlank()) {
      hit = findExactByExternalId(name, externalId);
      if (hit != null) return hit;
    }

    return null;
  }

  private FragellaDtos.Fragrance findExactByExternalId(String query, String targetExternalId) {
    if (query == null || query.isBlank()) return null;

    List<FragellaDtos.Fragrance> results;
    try {
      results = client.search(query, 20);
    } catch (Exception e) {
      return null;
    }
    if (results == null || results.isEmpty()) return null;

    for (var f : results) {
      if (f == null) continue;
      String computed = computeExternalId(f);
      if (!computed.isBlank() && computed.equals(targetExternalId)) {
        return f;
      }
    }
    return null;
  }

  private static String normalizeExternalId(String externalId) {
    if (externalId == null) return "";
    return externalId
      .trim()
      .toLowerCase(Locale.ROOT)
      .replaceAll("\\s+", " ")
      .trim();
  }

  // Must match your FragranceIngestService externalId() logic
  private static String computeExternalId(FragellaDtos.Fragrance f) {
    if (f == null) return "";

    String brand = nullSafe(f.brand());
    String name  = nullSafe(f.name());
    String year  = nullSafe(f.year());

    if (year.isBlank()) year = "0";

    String combined = (brand + "|" + name + "|" + year)
      .toLowerCase(Locale.ROOT)
      .replaceAll("\\s+", " ")
      .trim();

    if (combined.equals("||0") || combined.equals("||")) return "";
    return combined;
  }

  private static String nullSafe(String s) {
    return s == null ? "" : s.trim();
  }

  public FragranceSearchResult attachRatings(FragranceSearchResult in, String viewerSub) {
    if (in == null) return null;
    FragranceRatingSummary summary;
    if ("fragella".equalsIgnoreCase(in.source())) {
      String canonical = computeFragellaExternalIdFromResult(in);
      String zeroAliasExternal = toZeroYearAlias(in.externalId());
      String zeroAliasCanonical = toZeroYearAlias(canonical);
      FragranceRatingSummary raw = ratingService.getSummaryAcrossExternalIds(
        viewerSub,
        in.source(),
        List.of(in.externalId(), canonical, zeroAliasExternal, zeroAliasCanonical)
      );
      summary = blendFragellaRating(raw, in.rating());
      log.info(
        "fragella.attachRatings externalId={} canonicalId={} zeroAliasExternal={} zeroAliasCanonical={} baselineRaw={} rawAvg={} rawCount={} rawUserRating={} blendedAvg={}",
        in.externalId(),
        canonical,
        zeroAliasExternal,
        zeroAliasCanonical,
        in.rating(),
        raw == null ? null : raw.average(),
        raw == null ? null : raw.count(),
        raw == null ? null : raw.userRating(),
        summary == null ? null : summary.average()
      );
    } else {
      summary = ratingService.getSummary(viewerSub, in.source(), in.externalId());
    }
    return withIds(in, in.source(), in.externalId(), in.createdByUserId(), in.createdByUsername(), summary);
  }

  private FragranceRatingSummary blendFragellaRating(FragranceRatingSummary community, String baselineRaw) {
    if (community == null) return null;
    Double baseline = parseRatingValue(baselineRaw);
    if (baseline == null) return community;

    long count = Math.max(0L, community.count());
    double avg = Math.max(0.0, community.average());
    double blended = count <= 0
      ? baseline
      : ((baseline * FRAGELLA_RATING_PRIOR_WEIGHT) + (avg * count)) / (FRAGELLA_RATING_PRIOR_WEIGHT + count);
    return new FragranceRatingSummary(blended, count, community.userRating());
  }

  private Double parseRatingValue(String raw) {
    if (raw == null) return null;
    String s = raw.trim().replace(',', '.');
    if (s.isBlank()) return null;
    java.util.regex.Matcher m = java.util.regex.Pattern.compile("([0-9]+(?:\\.[0-9]+)?)").matcher(s);
    if (!m.find()) return null;
    try {
      double value = Double.parseDouble(m.group(1));
      if (!Double.isFinite(value)) return null;
      return Math.max(0.0, Math.min(5.0, value));
    } catch (Exception e) {
      return null;
    }
  }

  private String computeFragellaExternalIdFromResult(FragranceSearchResult in) {
    if (in == null) return "";
    String brand = nullSafe(in.brand());
    String name = nullSafe(in.name());
    String year = nullSafe(in.year());
    if (year.isBlank()) year = "0";
    String combined = (brand + "|" + name + "|" + year)
      .toLowerCase(Locale.ROOT)
      .replaceAll("\\s+", " ")
      .trim();
    if (combined.equals("||0") || combined.equals("||")) return "";
    return combined;
  }

  private String toZeroYearAlias(String externalId) {
    if (externalId == null) return "";
    String ext = externalId.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    if (ext.isBlank()) return "";
    String[] parts = ext.split("\\|", -1);
    if (parts.length < 2) return "";
    return (parts[0] + "|" + parts[1] + "|0").trim();
  }

  private FragranceSearchResult withIds(
    FragranceSearchResult in,
    String source,
    String externalId,
    java.util.UUID createdByUserIdFallback,
    String createdByUsernameFallback,
    FragranceRatingSummary ratingSummary
  ) {
    if (in == null) return null;
    var createdByUserId = in.createdByUserId() != null ? in.createdByUserId() : createdByUserIdFallback;
    var createdByUsername = resolveCreatedByUsername(createdByUserId, in.createdByUsername(), createdByUsernameFallback);
    String rating = in.rating();
    Long ratingCount = in.ratingCount();
    Double userRating = in.userRating();
    if (ratingSummary != null && ratingSummary.count() > 0) {
      rating = String.format(java.util.Locale.US, "%.2f", ratingSummary.average());
      ratingCount = ratingSummary.count();
      userRating = ratingSummary.userRating();
    }

    return new FragranceSearchResult(
      source,
      externalId,

      in.name(),
      in.brand(),
      in.year(),
      imageUrlResolver.resolveWithFallback(in.imageObjectKey(), in.imageUrl()),
      in.imageObjectKey(),
      in.gender(),

      rating,
      in.price(),
      in.priceValue(),

      in.oilType(),
      in.longevity(),
      in.sillage(),
      in.confidence(),
      in.popularity(),

      in.mainAccordsPercentage(),
      in.seasonRanking(),
      in.occasionRanking(),

      in.mainAccords(),
      in.generalNotes(),
      in.notes(),
      in.purchaseUrl(),

      // community-only passthrough (null for FRAGELLA)
      in.concentration(),
      in.longevityScore(),
      in.sillageScore(),
      in.visibility(),
      createdByUserId,
      createdByUsername,
      ratingCount,
      userRating
    );
  }

  private String resolveCreatedByUsername(java.util.UUID createdByUserId, String primary, String fallback) {
    String normalizedPrimary = primary == null ? "" : primary.trim();
    if (!normalizedPrimary.isBlank()) return normalizedPrimary;
    String normalizedFallback = fallback == null ? "" : fallback.trim();
    if (!normalizedFallback.isBlank()) return normalizedFallback;
    if (createdByUserId == null) return null;
    return userRepository.findById(createdByUserId)
      .map(u -> u.getUsername())
      .orElse(null);
  }

}
