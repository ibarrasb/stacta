package com.stacta.api.social;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_event")
public class NotificationEvent {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "recipient_user_id", nullable = false)
  private UUID recipientUserId;

  @Column(name = "actor_user_id", nullable = false)
  private UUID actorUserId;

  @Column(name = "type", nullable = false)
  private String type;

  @Column(name = "source_follow_id")
  private UUID sourceFollowId;

  @Column(name = "source_review_id")
  private UUID sourceReviewId;

  @Column(name = "source_comment_id")
  private UUID sourceCommentId;

  @Column(name = "aggregate_count", nullable = false)
  private int aggregateCount = 1;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getRecipientUserId() { return recipientUserId; }
  public void setRecipientUserId(UUID recipientUserId) { this.recipientUserId = recipientUserId; }
  public UUID getActorUserId() { return actorUserId; }
  public void setActorUserId(UUID actorUserId) { this.actorUserId = actorUserId; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public UUID getSourceFollowId() { return sourceFollowId; }
  public void setSourceFollowId(UUID sourceFollowId) { this.sourceFollowId = sourceFollowId; }
  public UUID getSourceReviewId() { return sourceReviewId; }
  public void setSourceReviewId(UUID sourceReviewId) { this.sourceReviewId = sourceReviewId; }
  public UUID getSourceCommentId() { return sourceCommentId; }
  public void setSourceCommentId(UUID sourceCommentId) { this.sourceCommentId = sourceCommentId; }
  public int getAggregateCount() { return aggregateCount; }
  public void setAggregateCount(int aggregateCount) { this.aggregateCount = aggregateCount; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
  public Instant getDeletedAt() { return deletedAt; }
  public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
