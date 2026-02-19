package com.stacta.api.collection;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
  name = "user_top_fragrance",
  uniqueConstraints = @UniqueConstraint(columnNames = {"user_collection_item_id"})
)
public class UserTopFragrance {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "user_collection_item_id", nullable = false)
  private UUID userCollectionItemId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public UUID getUserCollectionItemId() { return userCollectionItemId; }
  public void setUserCollectionItemId(UUID userCollectionItemId) { this.userCollectionItemId = userCollectionItemId; }
  public Instant getCreatedAt() { return createdAt; }
}
