package com.stacta.api.fragrance;

import com.stacta.api.fragrance.dto.FragranceRatingSummary;
import com.stacta.api.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class FragranceRatingService {

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

    jdbc.update(
      """
      INSERT INTO fragrance_rating (user_id, external_source, external_id, rating, created_at, updated_at)
      VALUES (?, ?, ?, ?, now(), now())
      ON CONFLICT (user_id, external_source, external_id)
      DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()
      """,
      user.getId(), src, ext, rating
    );

    return getSummary(cognitoSub, src, ext);
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

    return new FragranceRatingSummary(avg == null ? 0.0 : avg, count == null ? 0L : count, userRating);
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
