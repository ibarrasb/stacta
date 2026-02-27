package com.stacta.api.social;

import com.stacta.api.config.ApiException;
import com.stacta.api.social.dto.ReviewCommentItem;
import com.stacta.api.social.dto.ReviewThreadResponse;
import com.stacta.api.user.User;
import com.stacta.api.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewCommentService {

  private static final Set<String> REPORT_REASONS = Set.of("SPAM", "INAPPROPRIATE", "HARASSMENT", "OTHER");

  private final UserRepository users;
  private final ActivityEventRepository activities;
  private final FollowService follows;
  private final JdbcTemplate jdbc;

  public ReviewCommentService(
    UserRepository users,
    ActivityEventRepository activities,
    FollowService follows,
    JdbcTemplate jdbc
  ) {
    this.users = users;
    this.activities = activities;
    this.follows = follows;
    this.jdbc = jdbc;
  }

  @Transactional(readOnly = true)
  public ReviewThreadResponse thread(String viewerSub, UUID reviewId) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    ActivityEvent review = requireVisibleReview(me, reviewId);
    var row = activities.findReviewFeedItem(review.getId(), me.getId());
    if (row == null) throw new ApiException("REVIEW_NOT_FOUND");
    return new ReviewThreadResponse(mapFeed(row), listCommentsInternal(review.getId(), me.getId()));
  }

  @Transactional(readOnly = true)
  public List<ReviewCommentItem> listComments(String viewerSub, UUID reviewId) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    ActivityEvent review = requireVisibleReview(me, reviewId);
    return listCommentsInternal(review.getId(), me.getId());
  }

  @Transactional
  public ReviewCommentItem createComment(String viewerSub, UUID reviewId, String bodyRaw, UUID parentCommentId) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    ActivityEvent review = requireVisibleReview(me, reviewId);

    String body = safeTrim(bodyRaw);
    if (body.isEmpty() || body.length() > 1200) {
      throw new ApiException("INVALID_COMMENT");
    }

    UUID parentAuthorUserId = null;
    if (parentCommentId != null) {
      ParentRow parent = jdbc.query(
        """
        SELECT author_user_id, parent_comment_id
        FROM review_comment
        WHERE id = ?
          AND review_id = ?
        """,
        rs -> rs.next()
          ? new ParentRow(
            rs.getObject("author_user_id", UUID.class),
            rs.getObject("parent_comment_id", UUID.class)
          )
          : null,
        parentCommentId,
        review.getId()
      );
      if (parent == null) {
        throw new ApiException("COMMENT_NOT_FOUND");
      }
      if (parent.parentCommentId() != null) {
        throw new ApiException("INVALID_COMMENT");
      }
      parentAuthorUserId = parent.authorUserId();
    }

    CreatedComment created = jdbc.query(
      """
      INSERT INTO review_comment (review_id, parent_comment_id, author_user_id, body)
      VALUES (?, ?, ?, ?)
      RETURNING id, created_at
      """,
      rs -> rs.next()
        ? new CreatedComment(
          rs.getObject("id", UUID.class),
          rs.getTimestamp("created_at").toInstant()
        )
        : null,
      review.getId(),
      parentCommentId,
      me.getId(),
      body
    );
    if (created == null) {
      throw new ApiException("INVALID_COMMENT");
    }

    activities.bumpCommentsCount(review.getId(), 1);
    appendCommentNotifications(me.getId(), review, created.id(), parentCommentId, parentAuthorUserId);
    return fetchCommentItem(created.id(), me.getId());
  }

  @Transactional
  public void deleteComment(String viewerSub, UUID reviewId, UUID commentId) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    ActivityEvent review = requireVisibleReview(me, reviewId);

    UUID authorId = jdbc.query(
      """
      SELECT author_user_id
      FROM review_comment
      WHERE id = ?
        AND review_id = ?
      """,
      rs -> rs.next() ? rs.getObject("author_user_id", UUID.class) : null,
      commentId,
      review.getId()
    );
    if (authorId == null) {
      throw new ApiException("COMMENT_NOT_FOUND");
    }
    if (!me.getId().equals(authorId)) {
      throw new ApiException("COMMENT_FORBIDDEN");
    }

    Integer removedCount = jdbc.queryForObject(
      """
      WITH RECURSIVE tree AS (
        SELECT id
        FROM review_comment
        WHERE id = ?
          AND review_id = ?
        UNION ALL
        SELECT c.id
        FROM review_comment c
        JOIN tree t ON c.parent_comment_id = t.id
      )
      SELECT COUNT(*) FROM tree
      """,
      Integer.class,
      commentId,
      review.getId()
    );
    int safeRemoved = Math.max(0, removedCount == null ? 0 : removedCount);
    if (safeRemoved <= 0) {
      throw new ApiException("COMMENT_NOT_FOUND");
    }

    int deleted = jdbc.update(
      """
      DELETE FROM review_comment
      WHERE id = ?
        AND review_id = ?
      """,
      commentId,
      review.getId()
    );
    if (deleted <= 0) {
      throw new ApiException("COMMENT_NOT_FOUND");
    }

    activities.bumpCommentsCount(review.getId(), -safeRemoved);
  }

  @Transactional
  public void reportComment(String viewerSub, UUID reviewId, UUID commentId, String reasonRaw, String detailsRaw) {
    User me = users.findByCognitoSub(viewerSub).orElseThrow(() -> new ApiException("NOT_ONBOARDED"));
    requireVisibleReview(me, reviewId);
    String reason = normalizeReason(reasonRaw);
    String details = nullIfBlank(detailsRaw);
    if (details != null && details.length() > 1000) {
      throw new ApiException("INVALID_COMMENT");
    }

    Integer openCount = jdbc.queryForObject(
      """
      SELECT COUNT(*)
      FROM review_comment_report
      WHERE comment_id = ?
        AND reported_by_user_id = ?
        AND status = 'OPEN'
      """,
      Integer.class,
      commentId,
      me.getId()
    );
    if ((openCount == null ? 0 : openCount) > 0) {
      throw new ApiException("COMMENT_REPORT_ALREADY_EXISTS");
    }

    int inserted = jdbc.update(
      """
      INSERT INTO review_comment_report (comment_id, reported_by_user_id, reason, details)
      SELECT c.id, ?, ?, ?
      FROM review_comment c
      WHERE c.id = ?
        AND c.review_id = ?
      """,
      me.getId(),
      reason,
      details,
      commentId,
      reviewId
    );
    if (inserted <= 0) {
      throw new ApiException("COMMENT_NOT_FOUND");
    }
  }

  private ActivityEvent requireVisibleReview(User viewer, UUID reviewId) {
    ActivityEvent review = activities.findById(reviewId).orElseThrow(() -> new ApiException("REVIEW_NOT_FOUND"));
    if (!"REVIEW_POSTED".equalsIgnoreCase(String.valueOf(review.getType()))) {
      throw new ApiException("REVIEW_NOT_FOUND");
    }
    User actor = users.findById(review.getActorUserId()).orElseThrow(() -> new ApiException("REVIEW_NOT_FOUND"));
    boolean isOwner = actor.getId().equals(viewer.getId());
    boolean visible = !actor.isPrivate() || isOwner || follows.isFollowing(viewer.getId(), actor.getId());
    if (!visible) {
      throw new ApiException("REVIEW_NOT_FOUND");
    }
    return review;
  }

  private List<ReviewCommentItem> listCommentsInternal(UUID reviewId, UUID viewerUserId) {
    return jdbc.query(
      """
      SELECT
        c.id,
        c.review_id,
        c.parent_comment_id,
        c.body,
        c.created_at,
        u.username,
        u.display_name,
        u.avatar_url,
        CASE WHEN c.author_user_id = ? THEN true ELSE false END AS viewer_can_delete
      FROM review_comment c
      JOIN users u ON u.id = c.author_user_id
      WHERE c.review_id = ?
      ORDER BY c.created_at ASC, c.id ASC
      """,
      (rs, rowNum) -> new ReviewCommentItem(
        rs.getObject("id", UUID.class),
        rs.getObject("review_id", UUID.class),
        rs.getObject("parent_comment_id", UUID.class),
        rs.getString("username"),
        rs.getString("display_name"),
        rs.getString("avatar_url"),
        rs.getString("body"),
        rs.getTimestamp("created_at").toInstant(),
        rs.getBoolean("viewer_can_delete")
      ),
      viewerUserId,
      reviewId
    );
  }

  private ReviewCommentItem fetchCommentItem(UUID commentId, UUID viewerUserId) {
    return jdbc.query(
      """
      SELECT
        c.id,
        c.review_id,
        c.parent_comment_id,
        c.body,
        c.created_at,
        u.username,
        u.display_name,
        u.avatar_url,
        CASE WHEN c.author_user_id = ? THEN true ELSE false END AS viewer_can_delete
      FROM review_comment c
      JOIN users u ON u.id = c.author_user_id
      WHERE c.id = ?
      """,
      rs -> rs.next()
        ? new ReviewCommentItem(
          rs.getObject("id", UUID.class),
          rs.getObject("review_id", UUID.class),
          rs.getObject("parent_comment_id", UUID.class),
          rs.getString("username"),
          rs.getString("display_name"),
          rs.getString("avatar_url"),
          rs.getString("body"),
          rs.getTimestamp("created_at").toInstant(),
          rs.getBoolean("viewer_can_delete")
        )
        : null,
      viewerUserId,
      commentId
    );
  }

  private void appendCommentNotifications(
    UUID actorUserId,
    ActivityEvent review,
    UUID commentId,
    UUID parentCommentId,
    UUID parentAuthorUserId
  ) {
    if (!actorUserId.equals(review.getActorUserId())) {
      jdbc.update(
        """
        INSERT INTO notification_event (
          recipient_user_id,
          actor_user_id,
          type,
          source_review_id,
          source_comment_id,
          aggregate_count,
          created_at,
          deleted_at
        )
        VALUES (?, ?, 'REVIEW_COMMENTED', ?, ?, 1, now(), NULL)
        """,
        review.getActorUserId(),
        actorUserId,
        review.getId(),
        commentId
      );
    }

    if (parentCommentId != null && parentAuthorUserId != null) {
      if (!parentAuthorUserId.equals(actorUserId) && !parentAuthorUserId.equals(review.getActorUserId())) {
        jdbc.update(
          """
          INSERT INTO notification_event (
            recipient_user_id,
            actor_user_id,
            type,
            source_review_id,
            source_comment_id,
            aggregate_count,
            created_at,
            deleted_at
          )
          VALUES (?, ?, 'REVIEW_COMMENT_REPLIED', ?, ?, 1, now(), NULL)
          """,
          parentAuthorUserId,
          actorUserId,
          review.getId(),
          commentId
        );
      }
    }
  }

  private com.stacta.api.social.dto.FeedItem mapFeed(ActivityEventRepository.ActivityFeedView row) {
    return new com.stacta.api.social.dto.FeedItem(
      row.getId(),
      row.getType(),
      row.getActorUsername(),
      row.getActorDisplayName(),
      row.getActorAvatarUrl(),
      row.getTargetUsername(),
      row.getTargetDisplayName(),
      row.getFragranceName(),
      row.getFragranceSource(),
      row.getFragranceExternalId(),
      row.getFragranceImageUrl(),
      row.getCollectionTag(),
      row.getReviewRating(),
      row.getReviewExcerpt(),
      row.getReviewPerformance(),
      row.getReviewSeason(),
      row.getReviewOccasion(),
      row.getLikesCount(),
      row.getCommentsCount(),
      row.getRepostsCount(),
      row.getViewerHasLiked(),
      row.getCreatedAt()
    );
  }

  private String normalizeReason(String raw) {
    String normalized = safeTrim(raw).toUpperCase(Locale.ROOT);
    if (!REPORT_REASONS.contains(normalized)) {
      throw new ApiException("INVALID_COMMENT");
    }
    return normalized;
  }

  private String safeTrim(String raw) {
    return raw == null ? "" : raw.trim();
  }

  private String nullIfBlank(String raw) {
    String trimmed = safeTrim(raw);
    return trimmed.isEmpty() ? null : trimmed;
  }

  private record ParentRow(UUID authorUserId, UUID parentCommentId) {}

  private record CreatedComment(UUID id, Instant createdAt) {}
}
