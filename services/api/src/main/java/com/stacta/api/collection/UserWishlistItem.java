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
  name = "user_wishlist_item",
  uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "fragrance_source", "fragrance_external_id"})
)
public class UserWishlistItem {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "fragrance_source", nullable = false)
  private String fragranceSource;

  @Column(name = "fragrance_external_id", nullable = false)
  private String fragranceExternalId;

  @Column(name = "fragrance_name", nullable = false)
  private String fragranceName;

  @Column(name = "fragrance_brand")
  private String fragranceBrand;

  @Column(name = "fragrance_image_url")
  private String fragranceImageUrl;

  @Column(name = "added_at", nullable = false, updatable = false)
  private Instant addedAt;

  @PrePersist
  void onCreate() {
    if (addedAt == null) addedAt = Instant.now();
  }

  public UUID getId() { return id; }
  public UUID getUserId() { return userId; }
  public void setUserId(UUID userId) { this.userId = userId; }
  public String getFragranceSource() { return fragranceSource; }
  public void setFragranceSource(String fragranceSource) { this.fragranceSource = fragranceSource; }
  public String getFragranceExternalId() { return fragranceExternalId; }
  public void setFragranceExternalId(String fragranceExternalId) { this.fragranceExternalId = fragranceExternalId; }
  public String getFragranceName() { return fragranceName; }
  public void setFragranceName(String fragranceName) { this.fragranceName = fragranceName; }
  public String getFragranceBrand() { return fragranceBrand; }
  public void setFragranceBrand(String fragranceBrand) { this.fragranceBrand = fragranceBrand; }
  public String getFragranceImageUrl() { return fragranceImageUrl; }
  public void setFragranceImageUrl(String fragranceImageUrl) { this.fragranceImageUrl = fragranceImageUrl; }
  public Instant getAddedAt() { return addedAt; }
}
