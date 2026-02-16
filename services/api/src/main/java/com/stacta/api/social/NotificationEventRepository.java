package com.stacta.api.social;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationEventRepository extends JpaRepository<NotificationEvent, UUID> {

  @Query(value = """
    SELECT
      ne.id AS id,
      ne.type AS type,
      u.username AS actorUsername,
      u.display_name AS actorDisplayName,
      u.avatar_url AS actorAvatarUrl,
      ne.created_at AS createdAt
    FROM notification_event ne
    JOIN users u ON u.id = ne.actor_user_id
    WHERE ne.recipient_user_id = :recipientUserId
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
      AND ne.createdAt > :cutoff
  """)
  long countAfter(@Param("recipientUserId") UUID recipientUserId, @Param("cutoff") Instant cutoff);

  interface NotificationEventView {
    UUID getId();
    String getType();
    String getActorUsername();
    String getActorDisplayName();
    String getActorAvatarUrl();
    Instant getCreatedAt();
  }
}
