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

  interface PendingFollowRequestView {
    UUID getId();
    String getUsername();
    String getDisplayName();
    String getAvatarUrl();
    Instant getRequestedAt();
  }
}
