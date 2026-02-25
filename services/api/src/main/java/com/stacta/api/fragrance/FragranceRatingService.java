package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceRatingSummary;
import com.stacta.api.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class FragranceRatingService {
  private static final Logger log = LoggerFactory.getLogger(FragranceRatingService.class);

  private final JdbcTemplate jdbc;
  private final UserRepository users;

  public FragranceRatingService(JdbcTemplate jdbc, UserRepository users) {
    this.jdbc = jdbc;
    this.users = users;
  }

  @Transactional
  public FragranceRatingSummary upsertRating(String cognitoSub, String source, String externalId, int rating) {
    var user = users.findByCognitoSub(cognitoSub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded"));

    String src = normalizeSource(source);
    String ext = normalizeExternalId(externalId);
    log.info("rating.upsert.begin userId={} source={} externalId={} rating={}", user.getId(), src, ext, rating);

    jdbc.update(
      """
      INSERT INTO fragrance_rating (user_id, external_source, external_id, rating, created_at, updated_at)
      VALUES (?, ?, ?, ?, now(), now())
      ON CONFLICT (user_id, external_source, external_id)
      DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()
      """,
      user.getId(), src, ext, rating
    );

    FragranceRatingSummary summary = getSummary(cognitoSub, src, ext);
    log.info(
      "rating.upsert.done userId={} source={} externalId={} avg={} count={} userRating={}",
      user.getId(),
      src,
      ext,
      summary.average(),
      summary.count(),
      summary.userRating()
    );
    return summary;
  }

  @Transactional(readOnly = true)
  public FragranceRatingSummary getSummary(String cognitoSub, String source, String externalId) {
    String src = normalizeSource(source);
    String ext = normalizeExternalId(externalId);

    Double avg = jdbc.queryForObject(
      "SELECT AVG(rating)::float8 FROM fragrance_rating WHERE external_source = ? AND external_id = ?",
      Double.class,
      src,
      ext
    );

    Long count = jdbc.queryForObject(
      "SELECT COUNT(*) FROM fragrance_rating WHERE external_source = ? AND external_id = ?",
      Long.class,
      src,
      ext
    );

    Integer userRating = null;
    if (cognitoSub != null && !cognitoSub.isBlank()) {
      var userOpt = users.findByCognitoSub(cognitoSub);
      if (userOpt.isPresent()) {
        userRating = jdbc.query(
          "SELECT rating FROM fragrance_rating WHERE user_id = ? AND external_source = ? AND external_id = ?",
          rs -> rs.next() ? rs.getInt(1) : null,
          userOpt.get().getId(),
          src,
          ext
        );
      }
    }

    FragranceRatingSummary summary = new FragranceRatingSummary(avg == null ? 0.0 : avg, count == null ? 0L : count, userRating);
    log.info(
      "rating.summary source={} externalId={} avg={} count={} viewerHasRating={}",
      src,
      ext,
      summary.average(),
      summary.count(),
      summary.userRating() != null
    );
    return summary;
  }

  @Transactional(readOnly = true)
  public FragranceRatingSummary getSummaryPreferAlternate(
    String cognitoSub,
    String source,
    String externalId,
    String alternateExternalId
  ) {
    FragranceRatingSummary primary = getSummary(cognitoSub, source, externalId);
    String alt = normalizeExternalId(alternateExternalId);
    String ext = normalizeExternalId(externalId);
    if (alt.isBlank() || alt.equals(ext)) {
      log.info("rating.summary.alt.skip reason=same_or_blank source={} externalId={} alt={}", source, ext, alt);
      return primary;
    }
    FragranceRatingSummary alternate = getSummary(cognitoSub, source, alt);
    long pCount = Math.max(0L, primary.count());
    long aCount = Math.max(0L, alternate.count());
    long total = pCount + aCount;
    double mergedAvg = total == 0
      ? 0.0
      : ((primary.average() * pCount) + (alternate.average() * aCount)) / total;
    Integer mergedUserRating = primary.userRating() != null ? primary.userRating() : alternate.userRating();
    log.info(
      "rating.summary.alt.merge source={} externalId={} alt={} pCount={} aCount={} mergedCount={} mergedUserRating={}",
      source,
      ext,
      alt,
      pCount,
      aCount,
      total,
      mergedUserRating
    );
    return new FragranceRatingSummary(mergedAvg, total, mergedUserRating);
  }

  @Transactional(readOnly = true)
  public FragranceRatingSummary getSummaryAcrossExternalIds(
    String cognitoSub,
    String source,
    List<String> externalIds
  ) {
    String src = normalizeSource(source);
    Set<String> normalized = new LinkedHashSet<>();
    if (externalIds != null) {
      for (String id : externalIds) {
        String n = normalizeExternalId(id);
        if (!n.isBlank()) normalized.add(n);
      }
    }
    if (normalized.isEmpty()) {
      return new FragranceRatingSummary(0.0, 0L, null);
    }

    long totalCount = 0L;
    double weighted = 0.0;
    Integer userRating = null;
    for (String id : normalized) {
      FragranceRatingSummary s = getSummary(cognitoSub, src, id);
      long c = Math.max(0L, s.count());
      totalCount += c;
      weighted += s.average() * c;
      if (userRating == null && s.userRating() != null) {
        userRating = s.userRating();
      }
    }

    double avg = totalCount == 0 ? 0.0 : (weighted / totalCount);
    log.info(
      "rating.summary.multi source={} ids={} mergedCount={} mergedUserRating={}",
      src,
      normalized,
      totalCount,
      userRating
    );
    return new FragranceRatingSummary(avg, totalCount, userRating);
  }

  private static String normalizeSource(String source) {
    String src = source == null ? "FRAGELLA" : source.trim().toUpperCase(Locale.ROOT);
    if (!"COMMUNITY".equals(src) && !"FRAGELLA".equals(src)) return "FRAGELLA";
    return src;
  }

  private static String normalizeExternalId(String externalId) {
    return externalId == null ? "" : externalId.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
  }
}
