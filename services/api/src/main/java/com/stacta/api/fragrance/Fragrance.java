package com.stacta.api.fragrance;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
  name = "fragrance",
  uniqueConstraints = @UniqueConstraint(columnNames = {"external_source", "external_id"})
)
public class Fragrance {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "external_source", nullable = false)
  private String externalSource;

  @Column(name = "external_id", nullable = false)
  private String externalId;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String brand;

  private String year;

  @Column(name = "image_url")
  private String imageUrl;

  private String gender;

  // Fragella returns these as strings in examples, so keep string for now.
  private String rating;

  private String price;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb", nullable = false)
  private String snapshot;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @PrePersist
  void prePersist() {
    var now = OffsetDateTime.now();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = OffsetDateTime.now();
  }

    // COMMUNITY fields (Phase 1)
    @Column(name = "created_by_user_id")
    private UUID createdByUserId;
  
    @Column(name = "visibility", nullable = false)
    private String visibility = "PRIVATE"; // PRIVATE | PUBLIC
  
    @Column(name = "concentration")
    private String concentration;
  
    @Column(name = "longevity_score")
    private Integer longevityScore; // 1..5
  
    @Column(name = "sillage_score")
    private Integer sillageScore; // 1..5
  



  // getters/setters

  public UUID getId() { return id; }

  public String getExternalSource() { return externalSource; }
  public void setExternalSource(String externalSource) { this.externalSource = externalSource; }

  public String getExternalId() { return externalId; }
  public void setExternalId(String externalId) { this.externalId = externalId; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getBrand() { return brand; }
  public void setBrand(String brand) { this.brand = brand; }

  public String getYear() { return year; }
  public void setYear(String year) { this.year = year; }

  public String getImageUrl() { return imageUrl; }
  public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

  public String getGender() { return gender; }
  public void setGender(String gender) { this.gender = gender; }

  public String getRating() { return rating; }
  public void setRating(String rating) { this.rating = rating; }

  public String getPrice() { return price; }
  public void setPrice(String price) { this.price = price; }

  public String getSnapshot() { return snapshot; }
  public void setSnapshot(String snapshot) { this.snapshot = snapshot; }

  public OffsetDateTime getCreatedAt() { return createdAt; }
  public OffsetDateTime getUpdatedAt() { return updatedAt; }

  //Community
  public UUID getCreatedByUserId() { return createdByUserId; }
  public void setCreatedByUserId(UUID createdByUserId) { this.createdByUserId = createdByUserId; }

  public String getVisibility() { return visibility; }
  public void setVisibility(String visibility) { this.visibility = visibility; }

  public String getConcentration() { return concentration; }
  public void setConcentration(String concentration) { this.concentration = concentration; }

  public Integer getLongevityScore() { return longevityScore; }
  public void setLongevityScore(Integer longevityScore) { this.longevityScore = longevityScore; }

  public Integer getSillageScore() { return sillageScore; }
  public void setSillageScore(Integer sillageScore) { this.sillageScore = sillageScore; }
    
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

}
