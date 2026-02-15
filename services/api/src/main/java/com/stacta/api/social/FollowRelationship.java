package com.stacta.api.social;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.PrePersist;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_follow")
public class FollowRelationship {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "follower_user_id", nullable = false)
  private UUID followerUserId;

  @Column(name = "following_user_id", nullable = false)
  private UUID followingUserId;

  @Column(name = "status", nullable = false)
  private String status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "responded_at")
  private Instant respondedAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getFollowerUserId() { return followerUserId; }
  public void setFollowerUserId(UUID followerUserId) { this.followerUserId = followerUserId; }
  public UUID getFollowingUserId() { return followingUserId; }
  public void setFollowingUserId(UUID followingUserId) { this.followingUserId = followingUserId; }
  public String getStatus() { return status; }
  public void setStatus(String status) { this.status = status; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getRespondedAt() { return respondedAt; }
  public void setRespondedAt(Instant respondedAt) { this.respondedAt = respondedAt; }
}
