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
@Table(name = "activity_event")
public class ActivityEvent {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "actor_user_id", nullable = false)
  private UUID actorUserId;

  @Column(name = "target_user_id")
  private UUID targetUserId;

  @Column(name = "type", nullable = false)
  private String type;

  @Column(name = "fragrance_name")
  private String fragranceName;

  @Column(name = "fragrance_source")
  private String fragranceSource;

  @Column(name = "fragrance_external_id")
  private String fragranceExternalId;

  @Column(name = "fragrance_image_url")
  private String fragranceImageUrl;

  @Column(name = "review_rating")
  private Integer reviewRating;

  @Column(name = "review_excerpt")
  private String reviewExcerpt;

  @Column(name = "review_performance")
  private String reviewPerformance;

  @Column(name = "review_season")
  private String reviewSeason;

  @Column(name = "review_occasion")
  private String reviewOccasion;

  @Column(name = "likes_count", nullable = false)
  private int likesCount = 0;

  @Column(name = "comments_count", nullable = false)
  private int commentsCount = 0;

  @Column(name = "reposts_count", nullable = false)
  private int repostsCount = 0;

  @Column(name = "source_follow_id")
  private UUID sourceFollowId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getActorUserId() { return actorUserId; }
  public void setActorUserId(UUID actorUserId) { this.actorUserId = actorUserId; }
  public UUID getTargetUserId() { return targetUserId; }
  public void setTargetUserId(UUID targetUserId) { this.targetUserId = targetUserId; }
  public String getType() { return type; }
  public void setType(String type) { this.type = type; }
  public String getFragranceName() { return fragranceName; }
  public void setFragranceName(String fragranceName) { this.fragranceName = fragranceName; }
  public String getFragranceSource() { return fragranceSource; }
  public void setFragranceSource(String fragranceSource) { this.fragranceSource = fragranceSource; }
  public String getFragranceExternalId() { return fragranceExternalId; }
  public void setFragranceExternalId(String fragranceExternalId) { this.fragranceExternalId = fragranceExternalId; }
  public String getFragranceImageUrl() { return fragranceImageUrl; }
  public void setFragranceImageUrl(String fragranceImageUrl) { this.fragranceImageUrl = fragranceImageUrl; }
  public Integer getReviewRating() { return reviewRating; }
  public void setReviewRating(Integer reviewRating) { this.reviewRating = reviewRating; }
  public String getReviewExcerpt() { return reviewExcerpt; }
  public void setReviewExcerpt(String reviewExcerpt) { this.reviewExcerpt = reviewExcerpt; }
  public String getReviewPerformance() { return reviewPerformance; }
  public void setReviewPerformance(String reviewPerformance) { this.reviewPerformance = reviewPerformance; }
  public String getReviewSeason() { return reviewSeason; }
  public void setReviewSeason(String reviewSeason) { this.reviewSeason = reviewSeason; }
  public String getReviewOccasion() { return reviewOccasion; }
  public void setReviewOccasion(String reviewOccasion) { this.reviewOccasion = reviewOccasion; }
  public int getLikesCount() { return likesCount; }
  public void setLikesCount(int likesCount) { this.likesCount = likesCount; }
  public int getCommentsCount() { return commentsCount; }
  public void setCommentsCount(int commentsCount) { this.commentsCount = commentsCount; }
  public int getRepostsCount() { return repostsCount; }
  public void setRepostsCount(int repostsCount) { this.repostsCount = repostsCount; }
  public UUID getSourceFollowId() { return sourceFollowId; }
  public void setSourceFollowId(UUID sourceFollowId) { this.sourceFollowId = sourceFollowId; }
  public Instant getCreatedAt() { return createdAt; }
  public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
