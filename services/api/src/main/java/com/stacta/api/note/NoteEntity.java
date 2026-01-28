package com.stacta.api.note;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
  name = "note_dictionary",
  uniqueConstraints = @UniqueConstraint(columnNames = {"normalized_name"})
)
public class NoteEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Column(name = "normalized_name", nullable = false)
  private String normalizedName;

  @Column(name = "image_url")
  private String imageUrl;

  @Column(name = "usage_count", nullable = false)
  private Integer usageCount = 0;

  @Column(name = "created_at", nullable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  @PrePersist
  void prePersist() {
    var now = OffsetDateTime.now();
    this.createdAt = now;
    this.updatedAt = now;
    if (this.usageCount == null) this.usageCount = 0;
  }

  @PreUpdate
  void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
    if (this.usageCount == null) this.usageCount = 0;
  }

  // getters/setters

  public UUID getId() { return id; }
  public void setId(UUID id) { this.id = id; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getNormalizedName() { return normalizedName; }
  public void setNormalizedName(String normalizedName) { this.normalizedName = normalizedName; }

  public String getImageUrl() { return imageUrl; }
  public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

  public Integer getUsageCount() { return usageCount; }
  public void setUsageCount(Integer usageCount) { this.usageCount = usageCount; }

  public OffsetDateTime getCreatedAt() { return createdAt; }
  public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

  public OffsetDateTime getUpdatedAt() { return updatedAt; }
  public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
