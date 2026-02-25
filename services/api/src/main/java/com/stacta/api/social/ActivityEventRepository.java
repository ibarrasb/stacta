package com.stacta.api.social;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ActivityEventRepository extends JpaRepository<ActivityEvent, UUID> {
  long deleteBySourceFollowId(UUID sourceFollowId);
  long countByActorUserIdAndType(UUID actorUserId, String type);

  @Query(value = """
    SELECT
      ae.id AS id,
      ae.type AS type,
      ae.fragrance_name AS fragranceName,
      ae.fragrance_source AS fragranceSource,
      ae.fragrance_external_id AS fragranceExternalId,
      ae.fragrance_image_url AS fragranceImageUrl,
      ae.review_rating AS reviewRating,
      ae.review_excerpt AS reviewExcerpt,
      ae.review_performance AS reviewPerformance,
      ae.review_season AS reviewSeason,
      ae.review_occasion AS reviewOccasion,
      ae.likes_count AS likesCount,
      ae.comments_count AS commentsCount,
      ae.reposts_count AS repostsCount,
      ae.created_at AS createdAt,
      actor.username AS actorUsername,
      actor.display_name AS actorDisplayName,
      actor.avatar_url AS actorAvatarUrl,
      target.username AS targetUsername,
      target.display_name AS targetDisplayName
    FROM activity_event ae
    JOIN users actor ON actor.id = ae.actor_user_id
    LEFT JOIN users target ON target.id = ae.target_user_id
    LEFT JOIN user_follow uf ON uf.follower_user_id = :viewerUserId
      AND uf.following_user_id = ae.actor_user_id
      AND uf.status = 'ACCEPTED'
    WHERE (
      ae.actor_user_id = :viewerUserId
      OR uf.id IS NOT NULL
    )
      AND (
        CAST(:typeFilter AS text) IS NULL
        OR ae.type = CAST(:typeFilter AS text)
      )
      AND (
        CAST(:cursorCreatedAt AS timestamptz) IS NULL
        OR ae.created_at < CAST(:cursorCreatedAt AS timestamptz)
        OR (
          ae.created_at = CAST(:cursorCreatedAt AS timestamptz)
          AND ae.id < CAST(:cursorId AS uuid)
        )
      )
    ORDER BY ae.created_at DESC, ae.id DESC
    """, nativeQuery = true)
  List<ActivityFeedView> listFollowingFeed(
    @Param("viewerUserId") UUID viewerUserId,
    @Param("typeFilter") String typeFilter,
    @Param("cursorCreatedAt") Instant cursorCreatedAt,
    @Param("cursorId") UUID cursorId,
    Pageable pageable
  );

  @Query(value = """
    SELECT
      ae.id AS id,
      ae.type AS type,
      ae.fragrance_name AS fragranceName,
      ae.fragrance_source AS fragranceSource,
      ae.fragrance_external_id AS fragranceExternalId,
      ae.fragrance_image_url AS fragranceImageUrl,
      ae.review_rating AS reviewRating,
      ae.review_excerpt AS reviewExcerpt,
      ae.review_performance AS reviewPerformance,
      ae.review_season AS reviewSeason,
      ae.review_occasion AS reviewOccasion,
      ae.likes_count AS likesCount,
      ae.comments_count AS commentsCount,
      ae.reposts_count AS repostsCount,
      ae.created_at AS createdAt,
      actor.username AS actorUsername,
      actor.display_name AS actorDisplayName,
      actor.avatar_url AS actorAvatarUrl,
      target.username AS targetUsername,
      target.display_name AS targetDisplayName
    FROM activity_event ae
    JOIN users actor ON actor.id = ae.actor_user_id
    LEFT JOIN users target ON target.id = ae.target_user_id
    WHERE ae.actor_user_id = :actorUserId
      AND ae.type = 'REVIEW_POSTED'
      AND (
        CAST(:cursorCreatedAt AS timestamptz) IS NULL
        OR ae.created_at < CAST(:cursorCreatedAt AS timestamptz)
        OR (
          ae.created_at = CAST(:cursorCreatedAt AS timestamptz)
          AND ae.id < CAST(:cursorId AS uuid)
        )
      )
    ORDER BY ae.created_at DESC, ae.id DESC
    """, nativeQuery = true)
  List<ActivityFeedView> listMyReviewFeed(
    @Param("actorUserId") UUID actorUserId,
    @Param("cursorCreatedAt") Instant cursorCreatedAt,
    @Param("cursorId") UUID cursorId,
    Pageable pageable
  );

  @Query(value = """
    SELECT
      ae.id AS id,
      ae.type AS type,
      ae.fragrance_name AS fragranceName,
      ae.fragrance_source AS fragranceSource,
      ae.fragrance_external_id AS fragranceExternalId,
      ae.fragrance_image_url AS fragranceImageUrl,
      ae.review_rating AS reviewRating,
      ae.review_excerpt AS reviewExcerpt,
      ae.review_performance AS reviewPerformance,
      ae.review_season AS reviewSeason,
      ae.review_occasion AS reviewOccasion,
      ae.likes_count AS likesCount,
      ae.comments_count AS commentsCount,
      ae.reposts_count AS repostsCount,
      ae.created_at AS createdAt,
      actor.username AS actorUsername,
      actor.display_name AS actorDisplayName,
      actor.avatar_url AS actorAvatarUrl,
      target.username AS targetUsername,
      target.display_name AS targetDisplayName,
      ((ae.likes_count * 1) + (ae.comments_count * 2) + (ae.reposts_count * 3)) AS score
    FROM activity_event ae
    JOIN users actor ON actor.id = ae.actor_user_id
    LEFT JOIN users target ON target.id = ae.target_user_id
    LEFT JOIN user_follow uf ON uf.follower_user_id = :viewerUserId
      AND uf.following_user_id = ae.actor_user_id
      AND uf.status = 'ACCEPTED'
    WHERE (
      ae.actor_user_id = :viewerUserId
      OR uf.id IS NOT NULL
    )
      AND (
        CAST(:typeFilter AS text) IS NULL
        OR ae.type = CAST(:typeFilter AS text)
      )
      AND (
        CAST(:cursorScore AS integer) IS NULL
        OR ((ae.likes_count * 1) + (ae.comments_count * 2) + (ae.reposts_count * 3)) < CAST(:cursorScore AS integer)
        OR (
          ((ae.likes_count * 1) + (ae.comments_count * 2) + (ae.reposts_count * 3)) = CAST(:cursorScore AS integer)
          AND ae.created_at < CAST(:cursorCreatedAt AS timestamptz)
        )
        OR (
          ((ae.likes_count * 1) + (ae.comments_count * 2) + (ae.reposts_count * 3)) = CAST(:cursorScore AS integer)
          AND ae.created_at = CAST(:cursorCreatedAt AS timestamptz)
          AND ae.id < CAST(:cursorId AS uuid)
        )
      )
    ORDER BY score DESC, ae.created_at DESC, ae.id DESC
    """, nativeQuery = true)
  List<ActivityPopularView> listPopularFeed(
    @Param("viewerUserId") UUID viewerUserId,
    @Param("typeFilter") String typeFilter,
    @Param("cursorScore") Integer cursorScore,
    @Param("cursorCreatedAt") Instant cursorCreatedAt,
    @Param("cursorId") UUID cursorId,
    Pageable pageable
  );

  interface ActivityFeedView {
    UUID getId();
    String getType();
    String getFragranceName();
    String getFragranceSource();
    String getFragranceExternalId();
    String getFragranceImageUrl();
    Integer getReviewRating();
    String getReviewExcerpt();
    String getReviewPerformance();
    String getReviewSeason();
    String getReviewOccasion();
    int getLikesCount();
    int getCommentsCount();
    int getRepostsCount();
    Instant getCreatedAt();
    String getActorUsername();
    String getActorDisplayName();
    String getActorAvatarUrl();
    String getTargetUsername();
    String getTargetDisplayName();
  }

  interface ActivityPopularView extends ActivityFeedView {
    int getScore();
  }
}
