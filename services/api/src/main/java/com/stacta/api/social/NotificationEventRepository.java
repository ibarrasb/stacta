package com.stacta.api.social;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationEventRepository extends JpaRepository<NotificationEvent, UUID> {

  @Query(value = """
    SELECT
      ne.id AS id,
      ne.type AS type,
      u.username AS actorUsername,
      u.display_name AS actorDisplayName,
      u.avatar_object_key AS actorAvatarObjectKey,
      u.avatar_url AS actorAvatarUrl,
      ne.source_review_id AS sourceReviewId,
      ne.source_comment_id AS sourceCommentId,
      ne.aggregate_count AS aggregateCount,
      ae.fragrance_name AS reviewFragranceName,
      ae.fragrance_source AS reviewFragranceSource,
      ae.fragrance_external_id AS reviewFragranceExternalId,
      ne.created_at AS createdAt
    FROM notification_event ne
    JOIN users u ON u.id = ne.actor_user_id
    LEFT JOIN activity_event ae ON ae.id = ne.source_review_id
    WHERE ne.recipient_user_id = :recipientUserId
      AND ne.deleted_at IS NULL
      AND (
        CAST(:cursorEventAt AS timestamptz) IS NULL
        OR ne.created_at < CAST(:cursorEventAt AS timestamptz)
        OR (
          ne.created_at = CAST(:cursorEventAt AS timestamptz)
          AND ne.id < CAST(:cursorId AS uuid)
        )
      )
    ORDER BY ne.created_at DESC, ne.id DESC
    """, nativeQuery = true)
  List<NotificationEventView> listNotificationEvents(
    @Param("recipientUserId") UUID recipientUserId,
    @Param("cursorEventAt") Instant cursorEventAt,
    @Param("cursorId") UUID cursorId,
    Pageable pageable
  );

  @Query("""
    SELECT COUNT(ne)
    FROM NotificationEvent ne
    WHERE ne.recipientUserId = :recipientUserId
      AND ne.deletedAt IS NULL
      AND ne.createdAt > :cutoff
  """)
  long countAfter(@Param("recipientUserId") UUID recipientUserId, @Param("cutoff") Instant cutoff);

  interface NotificationEventView {
    UUID getId();
    String getType();
    String getActorUsername();
    String getActorDisplayName();
    String getActorAvatarObjectKey();
    String getActorAvatarUrl();
    UUID getSourceReviewId();
    UUID getSourceCommentId();
    Integer getAggregateCount();
    String getReviewFragranceName();
    String getReviewFragranceSource();
    String getReviewFragranceExternalId();
    Instant getCreatedAt();
  }

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("""
    UPDATE NotificationEvent ne
    SET ne.deletedAt = :deletedAt
    WHERE ne.id = :notificationId
      AND ne.recipientUserId = :recipientUserId
      AND ne.deletedAt IS NULL
  """)
  int softDeleteByIdForRecipient(
    @Param("recipientUserId") UUID recipientUserId,
    @Param("notificationId") UUID notificationId,
    @Param("deletedAt") Instant deletedAt
  );

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("""
    UPDATE NotificationEvent ne
    SET ne.deletedAt = :deletedAt
    WHERE ne.recipientUserId = :recipientUserId
      AND ne.deletedAt IS NULL
      AND ne.createdAt <= :seenAt
  """)
  int softDeleteAllReadForRecipient(
    @Param("recipientUserId") UUID recipientUserId,
    @Param("seenAt") Instant seenAt,
    @Param("deletedAt") Instant deletedAt
  );

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("""
    UPDATE NotificationEvent ne
    SET ne.deletedAt = :deletedAt
    WHERE ne.recipientUserId = :recipientUserId
      AND ne.deletedAt IS NULL
      AND ne.type <> 'MODERATION_STRIKE'
      AND (
        (ne.createdAt <= :seenAt AND ne.createdAt < :readCutoff)
        OR (ne.createdAt > :seenAt AND ne.createdAt < :unreadCutoff)
      )
  """)
  int softDeleteExpiredForRecipient(
    @Param("recipientUserId") UUID recipientUserId,
    @Param("seenAt") Instant seenAt,
    @Param("readCutoff") Instant readCutoff,
    @Param("unreadCutoff") Instant unreadCutoff,
    @Param("deletedAt") Instant deletedAt
  );

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query("""
    DELETE FROM NotificationEvent ne
    WHERE ne.deletedAt IS NOT NULL
      AND ne.deletedAt < :purgeBefore
  """)
  int hardDeleteSoftDeletedBefore(@Param("purgeBefore") Instant purgeBefore);
}
