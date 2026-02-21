package com.stacta.api.fragrance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record CreateCommunityFragranceRequest(
  @NotBlank @Size(max = 120) String name,
  @NotBlank @Size(max = 120) String brand,
  @Pattern(regexp = "^\\d{4}$", message = "year must be a 4-digit value") String year,
  @Size(max = 2000000) String imageUrl,
  @Size(max = 50) String concentration,
  @Min(1) @Max(5) Integer longevityScore,
  @Min(1) @Max(5) Integer sillageScore,
  @Size(max = 40) String confidence,
  @Size(max = 40) String popularity,
  @Size(max = 20) List<@Size(max = 40) String> mainAccords,
  @Size(max = 20) Map<@Size(max = 40) String, @Size(max = 20) String> mainAccordsPercentage,
  @Pattern(regexp = "^(?i)(PUBLIC|PRIVATE)$", message = "visibility must be PUBLIC or PRIVATE")
  String visibility, // PRIVATE or PUBLIC
  @Size(max = 20) List<UUID> topNoteIds,
  @Size(max = 20) List<UUID> middleNoteIds,
  @Size(max = 20) List<UUID> baseNoteIds
) {}
