package com.stacta.api.user;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "cognito_sub", nullable = false, unique = true)
  private String cognitoSub;

  @Column(name = "username", unique = true)
  private String username;

  @Column(name = "display_name", nullable = false)
  private String displayName;

  @Column(name = "bio")
  private String bio;

  @Column(name = "avatar_url")
  private String avatarUrl;

  @Column(name = "is_private", nullable = false)
  private boolean isPrivate = false;

  @Column(name = "is_verified", nullable = false)
  private boolean isVerified = false;

  @Column(name = "is_admin", nullable = false)
  private boolean isAdmin = false;

  @Column(name = "notifications_seen_at", nullable = false)
  private Instant notificationsSeenAt = Instant.now();

  @Column(name = "followers_count", nullable = false)
  private long followersCount = 0;

  @Column(name = "following_count", nullable = false)
  private long followingCount = 0;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  @PreUpdate
  void preUpdate() {
    this.updatedAt = Instant.now();
  }

  // getters/setters
  public UUID getId() { return id; }
  public String getCognitoSub() { return cognitoSub; }
  public void setCognitoSub(String cognitoSub) { this.cognitoSub = cognitoSub; }
  public String getUsername() { return username; }
  public void setUsername(String username) { this.username = username; }
  public String getDisplayName() { return displayName; }
  public void setDisplayName(String displayName) { this.displayName = displayName; }
  public String getBio() { return bio; }
  public void setBio(String bio) { this.bio = bio; }
  public String getAvatarUrl() { return avatarUrl; }
  public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
  public boolean isPrivate() { return isPrivate; }
  public void setPrivate(boolean aPrivate) { isPrivate = aPrivate; }
  public boolean isVerified() { return isVerified; }
  public void setVerified(boolean verified) { isVerified = verified; }
  public boolean isAdmin() { return isAdmin; }
  public void setAdmin(boolean admin) { isAdmin = admin; }
  public Instant getNotificationsSeenAt() { return notificationsSeenAt; }
  public void setNotificationsSeenAt(Instant notificationsSeenAt) { this.notificationsSeenAt = notificationsSeenAt; }
  public long getFollowersCount() { return followersCount; }
  public void setFollowersCount(long followersCount) { this.followersCount = followersCount; }
  public long getFollowingCount() { return followingCount; }
  public void setFollowingCount(long followingCount) { this.followingCount = followingCount; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }
}
