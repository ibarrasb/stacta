package com.stacta.api.fragrance;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.fragrance.dto.FragranceSearchResult;
import com.stacta.api.integrations.fragella.FragellaClient;
import com.stacta.api.integrations.fragella.FragellaDtos;

@Service
public class FragellaSearchService {

  private final FragellaClient client;
  private final FragellaMapper mapper;
  private final FragellaSearchCacheService cacheService;
  private final ObjectMapper objectMapper;

  // NEW: for persisted detail
  private final FragranceRepository fragranceRepository;

  public FragellaSearchService(
    FragellaClient client,
    FragellaMapper mapper,
    FragellaSearchCacheService cacheService,
    ObjectMapper objectMapper,
    FragranceRepository fragranceRepository
  ) {
    this.client = client;
    this.mapper = mapper;
    this.cacheService = cacheService;
    this.objectMapper = objectMapper;
    this.fragranceRepository = fragranceRepository;
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
   */
  public FragranceSearchResult getPersistedDetail(String source, String externalId) {
    String src = (source == null ? "FRAGELLA" : source.trim()).toUpperCase(Locale.ROOT);

    // tolerate both styles in DB ("FRAGELLA"/"fragella", "COMMUNITY"/"community")
    List<String> candidates = switch (src) {
      case "COMMUNITY" -> List.of("COMMUNITY", "community");
      case "FRAGELLA" -> List.of("FRAGELLA", "fragella");
      default -> List.of(src, src.toLowerCase(Locale.ROOT));
    };

    Optional<Fragrance> found = Optional.empty();
    for (String c : candidates) {
      found = fragranceRepository.findByExternalSourceAndExternalId(c, externalId);
      if (found.isPresent()) break;
    }

    if (found.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Fragrance not found");
    }

    Fragrance entity = found.get();
    String snapshot = entity.getSnapshot();
    if (snapshot == null || snapshot.isBlank()) snapshot = "{}";

    // what the FE expects as source string
    String responseSource =
      "COMMUNITY".equalsIgnoreCase(entity.getExternalSource()) ? "community" : "fragella";

    // 1) Try parse snapshot as Fragella DTO (typical for ingested FRAGELLA rows)
    try {
      FragellaDtos.Fragrance dto = objectMapper.readValue(snapshot, FragellaDtos.Fragrance.class);
      List<FragranceSearchResult> mapped = mapper.mapRaw(List.of(dto));
      if (mapped != null && !mapped.isEmpty()) {
        return withIds(mapped.get(0), responseSource, entity.getExternalId());
      }
    } catch (Exception ignore) {
      // fallthrough
    }

    // 2) Try parse snapshot already as FragranceSearchResult (good for COMMUNITY)
    try {
      FragranceSearchResult parsed = objectMapper.readValue(snapshot, FragranceSearchResult.class);
      return withIds(parsed, responseSource, entity.getExternalId());
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Snapshot parse failed");
    }
  }

  private static FragranceSearchResult withIds(FragranceSearchResult in, String source, String externalId) {
    if (in == null) return null;

    return new FragranceSearchResult(
      source,
      externalId,

      in.name(),
      in.brand(),
      in.year(),
      in.imageUrl(),
      in.gender(),

      in.rating(),
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
      in.purchaseUrl()
    );
  }
}
