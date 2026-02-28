package com.stacta.api.social;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FollowRepository extends JpaRepository<FollowRelationship, UUID> {
  Optional<FollowRelationship> findByFollowerUserIdAndFollowingUserId(UUID followerUserId, UUID followingUserId);
  long countByFollowingUserIdAndStatus(UUID followingUserId, String status);
  long countByFollowerUserIdAndStatus(UUID followerUserId, String status);
  boolean existsByFollowerUserIdAndFollowingUserIdAndStatus(UUID followerUserId, UUID followingUserId, String status);

  @Query(value = """
    SELECT
      fr.id AS id,
      u.username AS username,
      u.display_name AS displayName,
      u.avatar_object_key AS avatarObjectKey,
      u.avatar_url AS avatarUrl,
      fr.created_at AS requestedAt
    FROM user_follow fr
    JOIN users u ON u.id = fr.follower_user_id
    WHERE fr.following_user_id = :followingUserId
      AND fr.status = 'PENDING'
      AND (
        CAST(:cursorCreatedAt AS timestamptz) IS NULL
        OR fr.created_at < CAST(:cursorCreatedAt AS timestamptz)
        OR (
          fr.created_at = CAST(:cursorCreatedAt AS timestamptz)
          AND fr.id < CAST(:cursorId AS uuid)
        )
      )
    ORDER BY fr.created_at DESC, fr.id DESC
    """, nativeQuery = true)
  List<PendingFollowRequestView> listPendingRequestViews(
    @Param("followingUserId") UUID followingUserId,
    @Param("cursorCreatedAt") Instant cursorCreatedAt,
    @Param("cursorId") UUID cursorId,
    Pageable pageable
  );

  @Query(value = """
    SELECT
      fr.id AS id,
      u.username AS username,
      u.display_name AS displayName,
      u.avatar_object_key AS avatarObjectKey,
      u.avatar_url AS avatarUrl,
      u.is_private AS isPrivate,
      EXISTS (
        SELECT 1
        FROM user_follow reverse_fr
        WHERE reverse_fr.follower_user_id = :viewerUserId
          AND reverse_fr.following_user_id = fr.follower_user_id
          AND reverse_fr.status = 'ACCEPTED'
      ) AS isFollowing,
      COALESCE(fr.responded_at, fr.created_at) AS followedAt,
      TRUE AS followsYou
    FROM user_follow fr
    JOIN users u ON u.id = fr.follower_user_id
    WHERE fr.following_user_id = :viewerUserId
      AND fr.status = 'ACCEPTED'
      AND (
        CAST(:cursorFollowedAt AS timestamptz) IS NULL
        OR COALESCE(fr.responded_at, fr.created_at) < CAST(:cursorFollowedAt AS timestamptz)
        OR (
          COALESCE(fr.responded_at, fr.created_at) = CAST(:cursorFollowedAt AS timestamptz)
          AND fr.id < CAST(:cursorId AS uuid)
        )
      )
    ORDER BY COALESCE(fr.responded_at, fr.created_at) DESC, fr.id DESC
    """, nativeQuery = true)
  List<FollowConnectionView> listFollowers(
    @Param("viewerUserId") UUID viewerUserId,
    @Param("cursorFollowedAt") Instant cursorFollowedAt,
    @Param("cursorId") UUID cursorId,
    Pageable pageable
  );

  @Query(value = """
    SELECT
      fr.id AS id,
      u.username AS username,
      u.display_name AS displayName,
      u.avatar_object_key AS avatarObjectKey,
      u.avatar_url AS avatarUrl,
      u.is_private AS isPrivate,
      TRUE AS isFollowing,
      COALESCE(fr.responded_at, fr.created_at) AS followedAt,
      EXISTS (
        SELECT 1
        FROM user_follow reverse_fr
        WHERE reverse_fr.follower_user_id = fr.following_user_id
          AND reverse_fr.following_user_id = :viewerUserId
          AND reverse_fr.status = 'ACCEPTED'
      ) AS followsYou
    FROM user_follow fr
    JOIN users u ON u.id = fr.following_user_id
    WHERE fr.follower_user_id = :viewerUserId
      AND fr.status = 'ACCEPTED'
      AND (
        CAST(:cursorFollowedAt AS timestamptz) IS NULL
        OR COALESCE(fr.responded_at, fr.created_at) < CAST(:cursorFollowedAt AS timestamptz)
        OR (
          COALESCE(fr.responded_at, fr.created_at) = CAST(:cursorFollowedAt AS timestamptz)
          AND fr.id < CAST(:cursorId AS uuid)
        )
      )
    ORDER BY COALESCE(fr.responded_at, fr.created_at) DESC, fr.id DESC
    """, nativeQuery = true)
  List<FollowConnectionView> listFollowing(
    @Param("viewerUserId") UUID viewerUserId,
    @Param("cursorFollowedAt") Instant cursorFollowedAt,
    @Param("cursorId") UUID cursorId,
    Pageable pageable
  );

  interface PendingFollowRequestView {
    UUID getId();
    String getUsername();
    String getDisplayName();
    String getAvatarObjectKey();
    String getAvatarUrl();
    Instant getRequestedAt();
  }

  interface FollowConnectionView {
    UUID getId();
    String getUsername();
    String getDisplayName();
    String getAvatarObjectKey();
    String getAvatarUrl();
    Boolean getIsPrivate();
    Boolean getIsFollowing();
    Instant getFollowedAt();
    Boolean getFollowsYou();
  }
}
