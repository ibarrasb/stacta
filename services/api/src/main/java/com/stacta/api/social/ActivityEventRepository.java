package com.stacta.api.social;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;

public interface ActivityEventRepository extends JpaRepository<ActivityEvent, UUID> {
  long deleteBySourceFollowId(UUID sourceFollowId);
  long countByActorUserIdAndType(UUID actorUserId, String type);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("""
    UPDATE ActivityEvent ae
    SET ae.likesCount = CASE
      WHEN ae.likesCount + :delta < 0 THEN 0
      ELSE ae.likesCount + :delta
    END
    WHERE ae.id = :reviewId
      AND ae.type = 'REVIEW_POSTED'
  """)
  int bumpLikesCount(@Param("reviewId") UUID reviewId, @Param("delta") int delta);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("""
    UPDATE ActivityEvent ae
    SET ae.commentsCount = CASE
      WHEN ae.commentsCount + :delta < 0 THEN 0
      ELSE ae.commentsCount + :delta
    END
    WHERE ae.id = :reviewId
      AND ae.type = 'REVIEW_POSTED'
  """)
  int bumpCommentsCount(@Param("reviewId") UUID reviewId, @Param("delta") int delta);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("""
    UPDATE ActivityEvent ae
    SET ae.repostsCount = CASE
      WHEN ae.repostsCount + :delta < 0 THEN 0
      ELSE ae.repostsCount + :delta
    END
    WHERE ae.id = :reviewId
      AND ae.type = 'REVIEW_POSTED'
  """)
  int bumpRepostsCount(@Param("reviewId") UUID reviewId, @Param("delta") int delta);

  @Query(value = """
    SELECT
      ae.id AS id,
      COALESCE(ae.source_review_id, ae.id) AS sourceReviewId,
      ae.type AS type,
      ae.fragrance_name AS fragranceName,
      ae.fragrance_source AS fragranceSource,
      ae.fragrance_external_id AS fragranceExternalId,
      ae.fragrance_image_url AS fragranceImageUrl,
      ae.collection_tag AS collectionTag,
      ae.review_rating AS reviewRating,
      ae.review_excerpt AS reviewExcerpt,
      ae.review_performance AS reviewPerformance,
      ae.review_season AS reviewSeason,
      ae.review_occasion AS reviewOccasion,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.likes_count ELSE ae.likes_count END AS likesCount,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.comments_count ELSE ae.comments_count END AS commentsCount,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.reposts_count ELSE ae.reposts_count END AS repostsCount,
      CASE WHEN rl.user_id IS NULL THEN false ELSE true END AS viewerHasLiked,
      CASE WHEN rr.user_id IS NULL THEN false ELSE true END AS viewerHasReposted,
      ae.created_at AS createdAt,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.username ELSE actor.username END AS actorUsername,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.display_name ELSE actor.display_name END AS actorDisplayName,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.avatar_object_key ELSE actor.avatar_object_key END AS actorAvatarObjectKey,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.avatar_url ELSE actor.avatar_url END AS actorAvatarUrl,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.username ELSE NULL END AS repostActorUsername,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.display_name ELSE NULL END AS repostActorDisplayName,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.avatar_object_key ELSE NULL END AS repostActorAvatarObjectKey,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.avatar_url ELSE NULL END AS repostActorAvatarUrl,
      target.username AS targetUsername,
      target.display_name AS targetDisplayName
    FROM activity_event ae
    JOIN users actor ON actor.id = ae.actor_user_id
    LEFT JOIN activity_event src ON src.id = ae.source_review_id AND src.type = 'REVIEW_POSTED'
    LEFT JOIN users src_actor ON src_actor.id = src.actor_user_id
    LEFT JOIN users target ON target.id = ae.target_user_id
    LEFT JOIN review_like rl ON rl.review_id = COALESCE(ae.source_review_id, ae.id) AND rl.user_id = :viewerUserId
    LEFT JOIN review_repost rr ON rr.review_id = COALESCE(ae.source_review_id, ae.id) AND rr.user_id = :viewerUserId
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
      COALESCE(ae.source_review_id, ae.id) AS sourceReviewId,
      ae.type AS type,
      ae.fragrance_name AS fragranceName,
      ae.fragrance_source AS fragranceSource,
      ae.fragrance_external_id AS fragranceExternalId,
      ae.fragrance_image_url AS fragranceImageUrl,
      ae.collection_tag AS collectionTag,
      ae.review_rating AS reviewRating,
      ae.review_excerpt AS reviewExcerpt,
      ae.review_performance AS reviewPerformance,
      ae.review_season AS reviewSeason,
      ae.review_occasion AS reviewOccasion,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.likes_count ELSE ae.likes_count END AS likesCount,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.comments_count ELSE ae.comments_count END AS commentsCount,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.reposts_count ELSE ae.reposts_count END AS repostsCount,
      CASE WHEN rl.user_id IS NULL THEN false ELSE true END AS viewerHasLiked,
      CASE WHEN rr.user_id IS NULL THEN false ELSE true END AS viewerHasReposted,
      ae.created_at AS createdAt,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.username ELSE actor.username END AS actorUsername,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.display_name ELSE actor.display_name END AS actorDisplayName,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.avatar_object_key ELSE actor.avatar_object_key END AS actorAvatarObjectKey,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.avatar_url ELSE actor.avatar_url END AS actorAvatarUrl,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.username ELSE NULL END AS repostActorUsername,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.display_name ELSE NULL END AS repostActorDisplayName,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.avatar_object_key ELSE NULL END AS repostActorAvatarObjectKey,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.avatar_url ELSE NULL END AS repostActorAvatarUrl,
      target.username AS targetUsername,
      target.display_name AS targetDisplayName
    FROM activity_event ae
    JOIN users actor ON actor.id = ae.actor_user_id
    LEFT JOIN activity_event src ON src.id = ae.source_review_id AND src.type = 'REVIEW_POSTED'
    LEFT JOIN users src_actor ON src_actor.id = src.actor_user_id
    LEFT JOIN users target ON target.id = ae.target_user_id
    LEFT JOIN review_like rl ON rl.review_id = COALESCE(ae.source_review_id, ae.id) AND rl.user_id = :viewerUserId
    LEFT JOIN review_repost rr ON rr.review_id = COALESCE(ae.source_review_id, ae.id) AND rr.user_id = :viewerUserId
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
    @Param("viewerUserId") UUID viewerUserId,
    @Param("cursorCreatedAt") Instant cursorCreatedAt,
    @Param("cursorId") UUID cursorId,
    Pageable pageable
  );

  @Query(value = """
    SELECT
      ae.id AS id,
      COALESCE(ae.source_review_id, ae.id) AS sourceReviewId,
      ae.type AS type,
      ae.fragrance_name AS fragranceName,
      ae.fragrance_source AS fragranceSource,
      ae.fragrance_external_id AS fragranceExternalId,
      ae.fragrance_image_url AS fragranceImageUrl,
      ae.collection_tag AS collectionTag,
      ae.review_rating AS reviewRating,
      ae.review_excerpt AS reviewExcerpt,
      ae.review_performance AS reviewPerformance,
      ae.review_season AS reviewSeason,
      ae.review_occasion AS reviewOccasion,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.likes_count ELSE ae.likes_count END AS likesCount,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.comments_count ELSE ae.comments_count END AS commentsCount,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.reposts_count ELSE ae.reposts_count END AS repostsCount,
      CASE WHEN rl.user_id IS NULL THEN false ELSE true END AS viewerHasLiked,
      CASE WHEN rr.user_id IS NULL THEN false ELSE true END AS viewerHasReposted,
      ae.created_at AS createdAt,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.username ELSE actor.username END AS actorUsername,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.display_name ELSE actor.display_name END AS actorDisplayName,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.avatar_object_key ELSE actor.avatar_object_key END AS actorAvatarObjectKey,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.avatar_url ELSE actor.avatar_url END AS actorAvatarUrl,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.username ELSE NULL END AS repostActorUsername,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.display_name ELSE NULL END AS repostActorDisplayName,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.avatar_object_key ELSE NULL END AS repostActorAvatarObjectKey,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.avatar_url ELSE NULL END AS repostActorAvatarUrl,
      target.username AS targetUsername,
      target.display_name AS targetDisplayName
    FROM activity_event ae
    JOIN users actor ON actor.id = ae.actor_user_id
    LEFT JOIN activity_event src ON src.id = ae.source_review_id AND src.type = 'REVIEW_POSTED'
    LEFT JOIN users src_actor ON src_actor.id = src.actor_user_id
    LEFT JOIN users target ON target.id = ae.target_user_id
    LEFT JOIN review_like rl ON rl.review_id = COALESCE(ae.source_review_id, ae.id) AND rl.user_id = :viewerUserId
    LEFT JOIN review_repost rr ON rr.review_id = COALESCE(ae.source_review_id, ae.id) AND rr.user_id = :viewerUserId
    WHERE ae.id = :reviewId
      AND ae.type = 'REVIEW_POSTED'
    LIMIT 1
    """, nativeQuery = true)
  ActivityFeedView findReviewFeedItem(
    @Param("reviewId") UUID reviewId,
    @Param("viewerUserId") UUID viewerUserId
  );

  @Query(value = """
    SELECT
      ae.id AS id,
      COALESCE(ae.source_review_id, ae.id) AS sourceReviewId,
      ae.type AS type,
      ae.fragrance_name AS fragranceName,
      ae.fragrance_source AS fragranceSource,
      ae.fragrance_external_id AS fragranceExternalId,
      ae.fragrance_image_url AS fragranceImageUrl,
      ae.collection_tag AS collectionTag,
      ae.review_rating AS reviewRating,
      ae.review_excerpt AS reviewExcerpt,
      ae.review_performance AS reviewPerformance,
      ae.review_season AS reviewSeason,
      ae.review_occasion AS reviewOccasion,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.likes_count ELSE ae.likes_count END AS likesCount,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.comments_count ELSE ae.comments_count END AS commentsCount,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src.id IS NOT NULL THEN src.reposts_count ELSE ae.reposts_count END AS repostsCount,
      CASE WHEN rl.user_id IS NULL THEN false ELSE true END AS viewerHasLiked,
      CASE WHEN rr.user_id IS NULL THEN false ELSE true END AS viewerHasReposted,
      ae.created_at AS createdAt,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.username ELSE actor.username END AS actorUsername,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.display_name ELSE actor.display_name END AS actorDisplayName,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.avatar_object_key ELSE actor.avatar_object_key END AS actorAvatarObjectKey,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' AND src_actor.id IS NOT NULL THEN src_actor.avatar_url ELSE actor.avatar_url END AS actorAvatarUrl,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.username ELSE NULL END AS repostActorUsername,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.display_name ELSE NULL END AS repostActorDisplayName,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.avatar_object_key ELSE NULL END AS repostActorAvatarObjectKey,
      CASE WHEN ae.type = 'REVIEW_REPOSTED' THEN actor.avatar_url ELSE NULL END AS repostActorAvatarUrl,
      target.username AS targetUsername,
      target.display_name AS targetDisplayName,
      ((ae.likes_count * 1) + (ae.comments_count * 2) + (ae.reposts_count * 3)) AS score
    FROM activity_event ae
    JOIN users actor ON actor.id = ae.actor_user_id
    LEFT JOIN activity_event src ON src.id = ae.source_review_id AND src.type = 'REVIEW_POSTED'
    LEFT JOIN users src_actor ON src_actor.id = src.actor_user_id
    LEFT JOIN users target ON target.id = ae.target_user_id
    LEFT JOIN review_like rl ON rl.review_id = COALESCE(ae.source_review_id, ae.id) AND rl.user_id = :viewerUserId
    LEFT JOIN review_repost rr ON rr.review_id = COALESCE(ae.source_review_id, ae.id) AND rr.user_id = :viewerUserId
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
    UUID getSourceReviewId();
    String getType();
    String getFragranceName();
    String getFragranceSource();
    String getFragranceExternalId();
    String getFragranceImageUrl();
    String getCollectionTag();
    Integer getReviewRating();
    String getReviewExcerpt();
    String getReviewPerformance();
    String getReviewSeason();
    String getReviewOccasion();
    int getLikesCount();
    int getCommentsCount();
    int getRepostsCount();
    boolean getViewerHasLiked();
    boolean getViewerHasReposted();
    Instant getCreatedAt();
    String getActorUsername();
    String getActorDisplayName();
    String getActorAvatarObjectKey();
    String getActorAvatarUrl();
    String getRepostActorUsername();
    String getRepostActorDisplayName();
    String getRepostActorAvatarObjectKey();
    String getRepostActorAvatarUrl();
    String getTargetUsername();
    String getTargetDisplayName();
  }

  interface ActivityPopularView extends ActivityFeedView {
    int getScore();
  }
}
