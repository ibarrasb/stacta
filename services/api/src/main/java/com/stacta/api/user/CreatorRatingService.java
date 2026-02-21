package com.stacta.api.user;

import com.stacta.api.user.dto.CreatorRatingSummary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Locale;
import java.util.UUID;

@Service
public class CreatorRatingService {
  private final JdbcTemplate jdbc;
  private final UserRepository users;

  public CreatorRatingService(JdbcTemplate jdbc, UserRepository users) {
    this.jdbc = jdbc;
    this.users = users;
  }

  @Transactional
  public CreatorRatingSummary upsertRating(String raterSub, String creatorUsername, int rating) {
    var rater = users.findByCognitoSub(raterSub)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not onboarded"));
    var creator = users.findByUsernameIgnoreCase(normalizeUsername(creatorUsername))
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Creator not found"));

    if (rater.getId().equals(creator.getId())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot rate yourself");
    }

    jdbc.update(
      """
      INSERT INTO creator_reputation_rating (rater_user_id, creator_user_id, rating, created_at, updated_at)
      VALUES (?, ?, ?, now(), now())
      ON CONFLICT (rater_user_id, creator_user_id)
      DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()
      """,
      rater.getId(), creator.getId(), rating
    );

    return getSummaryByCreatorId(raterSub, creator.getId());
  }

  @Transactional(readOnly = true)
  public CreatorRatingSummary getSummary(String viewerSub, String creatorUsername) {
    var creator = users.findByUsernameIgnoreCase(normalizeUsername(creatorUsername))
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Creator not found"));
    return getSummaryByCreatorId(viewerSub, creator.getId());
  }

  @Transactional(readOnly = true)
  public CreatorRatingSummary getSummaryByCreatorId(String viewerSub, UUID creatorUserId) {
    Double avg = jdbc.queryForObject(
      "SELECT AVG(rating)::float8 FROM creator_reputation_rating WHERE creator_user_id = ?",
      Double.class,
      creatorUserId
    );
    Long count = jdbc.queryForObject(
      "SELECT COUNT(*) FROM creator_reputation_rating WHERE creator_user_id = ?",
      Long.class,
      creatorUserId
    );

    Integer userRating = null;
    if (viewerSub != null && !viewerSub.isBlank()) {
      var viewer = users.findByCognitoSub(viewerSub).orElse(null);
      if (viewer != null) {
        userRating = jdbc.query(
          "SELECT rating FROM creator_reputation_rating WHERE rater_user_id = ? AND creator_user_id = ?",
          rs -> rs.next() ? rs.getInt(1) : null,
          viewer.getId(),
          creatorUserId
        );
      }
    }

    return new CreatorRatingSummary(avg == null ? 0.0 : avg, count == null ? 0L : count, userRating);
  }

  private String normalizeUsername(String raw) {
    return String.valueOf(raw == null ? "" : raw)
      .trim()
      .toLowerCase(Locale.ROOT)
      .replaceAll("^@+", "");
  }
}
