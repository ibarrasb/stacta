package com.stacta.api.social;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stacta.api.config.ApiException;
import com.stacta.api.social.dto.CreateReviewRequest;
import com.stacta.api.social.dto.ReviewLikeResponse;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewService {

  private final ActivityEventRepository activities;
  private final UserRepository users;
  private final ObjectMapper objectMapper;
  private final JdbcTemplate jdbc;

  public ReviewService(
    ActivityEventRepository activities,
    UserRepository users,
    ObjectMapper objectMapper,
    JdbcTemplate jdbc
  ) {
    this.activities = activities;
    this.users = users;
    this.objectMapper = objectMapper;
    this.jdbc = jdbc;
  }

  @Transactional
  public void submit(String viewerSub, CreateReviewRequest req) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));

    String source = normalizeSource(req.source());
    String externalId = safeTrim(req.externalId());
    String fragranceName = safeTrim(req.fragranceName());
    String excerpt = safeTrim(req.excerpt());
    if (externalId.isEmpty() || fragranceName.isEmpty() || excerpt.isEmpty()) {
      throw new ApiException("INVALID_REVIEW");
    }

    Map<String, Integer> performance = normalizeRatingMap(req.performance(), 8);
    Map<String, Integer> season = normalizeRatingMap(req.season(), 16);
    Map<String, Integer> occasion = normalizeRatingMap(req.occasion(), 24);

    ActivityEvent event = new ActivityEvent();
    event.setActorUserId(me.getId());
    event.setType("REVIEW_POSTED");
    event.setFragranceName(fragranceName);
    event.setFragranceSource(source);
    event.setFragranceExternalId(externalId);
    event.setFragranceImageUrl(nullIfBlank(req.fragranceImageUrl()));
    event.setReviewRating(req.rating());
    event.setReviewExcerpt(excerpt.length() > 1200 ? excerpt.substring(0, 1200) : excerpt);
    event.setReviewPerformance(toJsonOrNull(performance));
    event.setReviewSeason(toJsonOrNull(season));
    event.setReviewOccasion(toJsonOrNull(occasion));
    activities.save(event);
  }

  @Transactional
  public void delete(String viewerSub, UUID reviewId) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    ActivityEvent event = activities.findById(reviewId).orElseThrow(() -> new ApiException("REVIEW_NOT_FOUND"));
    if (!"REVIEW_POSTED".equalsIgnoreCase(String.valueOf(event.getType()))) {
      throw new ApiException("REVIEW_NOT_FOUND");
    }
    if (!me.getId().equals(event.getActorUserId())) {
      throw new ApiException("REVIEW_FORBIDDEN");
    }
    activities.delete(event);
  }

  @Transactional
  public ReviewLikeResponse like(String viewerSub, UUID reviewId) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    ActivityEvent review = getReviewOrThrow(reviewId);
    if (me.getId().equals(review.getActorUserId())) {
      throw new ApiException("REVIEW_FORBIDDEN");
    }

    int inserted = jdbc.update(
      """
      INSERT INTO review_like (review_id, user_id)
      VALUES (?, ?)
      ON CONFLICT DO NOTHING
      """,
      reviewId,
      me.getId()
    );
    if (inserted > 0) {
      activities.bumpLikesCount(reviewId, 1);
    }

    syncReviewLikeNotification(reviewId, review.getActorUserId());
    int likesCount = getLikesCount(reviewId);
    return new ReviewLikeResponse(likesCount, true);
  }

  @Transactional
  public ReviewLikeResponse unlike(String viewerSub, UUID reviewId) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    ActivityEvent review = getReviewOrThrow(reviewId);
    if (me.getId().equals(review.getActorUserId())) {
      throw new ApiException("REVIEW_FORBIDDEN");
    }

    int deleted = jdbc.update(
      """
      DELETE FROM review_like
      WHERE review_id = ?
        AND user_id = ?
      """,
      reviewId,
      me.getId()
    );
    if (deleted > 0) {
      activities.bumpLikesCount(reviewId, -1);
    }

    syncReviewLikeNotification(reviewId, review.getActorUserId());
    int likesCount = getLikesCount(reviewId);
    return new ReviewLikeResponse(likesCount, false);
  }

  private ActivityEvent getReviewOrThrow(UUID reviewId) {
    ActivityEvent event = activities.findById(reviewId).orElseThrow(() -> new ApiException("REVIEW_NOT_FOUND"));
    if (!"REVIEW_POSTED".equalsIgnoreCase(String.valueOf(event.getType()))) {
      throw new ApiException("REVIEW_NOT_FOUND");
    }
    return event;
  }

  private int getLikesCount(UUID reviewId) {
    return activities.findById(reviewId)
      .map(ActivityEvent::getLikesCount)
      .orElse(0);
  }

  private void syncReviewLikeNotification(UUID reviewId, UUID recipientUserId) {
    if (reviewId == null || recipientUserId == null) return;
    Integer count = jdbc.queryForObject(
      """
      SELECT COUNT(*)
      FROM review_like
      WHERE review_id = ?
        AND user_id <> ?
      """,
      Integer.class,
      reviewId,
      recipientUserId
    );
    int safeCount = Math.max(0, count == null ? 0 : count);
    if (safeCount <= 0) {
      jdbc.update(
        """
        DELETE FROM notification_event
        WHERE recipient_user_id = ?
          AND source_review_id = ?
          AND type = 'REVIEW_LIKED'
        """,
        recipientUserId,
        reviewId
      );
      return;
    }

    UUID latestActor = jdbc.query(
      """
      SELECT user_id
      FROM review_like
      WHERE review_id = ?
        AND user_id <> ?
      ORDER BY created_at DESC
      LIMIT 1
      """,
      rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
      reviewId,
      recipientUserId
    );
    if (latestActor == null) return;

    jdbc.update(
      """
      INSERT INTO notification_event (
        recipient_user_id,
        actor_user_id,
        type,
        source_review_id,
        aggregate_count,
        created_at,
        deleted_at
      )
      VALUES (?, ?, 'REVIEW_LIKED', ?, ?, now(), NULL)
      ON CONFLICT (recipient_user_id, source_review_id, type)
      WHERE type = 'REVIEW_LIKED'
      DO UPDATE SET
        actor_user_id = EXCLUDED.actor_user_id,
        aggregate_count = EXCLUDED.aggregate_count,
        created_at = now(),
        deleted_at = NULL
      """,
      recipientUserId,
      latestActor,
      reviewId,
      safeCount
    );
  }

  private Map<String, Integer> normalizeRatingMap(Map<String, Integer> input, int maxEntries) {
    if (input == null || input.isEmpty()) return Map.of();
    Map<String, Integer> out = new LinkedHashMap<>();
    for (var entry : input.entrySet()) {
      if (out.size() >= maxEntries) break;
      String key = safeTrim(entry.getKey()).toLowerCase(Locale.ROOT);
      Integer value = entry.getValue();
      if (key.isEmpty() || key.length() > 64 || value == null) continue;
      if (value < 1 || value > 5) continue;
      out.put(key, value);
    }
    return out;
  }

  private String normalizeSource(String raw) {
    String s = safeTrim(raw).toUpperCase(Locale.ROOT);
    return switch (s) {
      case "FRAGELLA", "COMMUNITY" -> s;
      default -> throw new ApiException("INVALID_REVIEW");
    };
  }

  private String toJsonOrNull(Map<String, Integer> map) {
    if (map == null || map.isEmpty()) return null;
    try {
      return objectMapper.writeValueAsString(map);
    } catch (JsonProcessingException e) {
      throw new ApiException("INVALID_REVIEW");
    }
  }

  private String safeTrim(String raw) {
    return raw == null ? "" : raw.trim();
  }

  private String nullIfBlank(String raw) {
    String trimmed = safeTrim(raw);
    return trimmed.isEmpty() ? null : trimmed;
  }
}
