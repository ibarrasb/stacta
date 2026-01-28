package com.stacta.api.fragrance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateCommunityFragranceRequest(
  @NotBlank String name,
  @NotBlank String brand,
  String year,
  String concentration,
  Integer longevityScore,
  Integer sillageScore,
  String visibility, // PRIVATE or PUBLIC
  @Size(max = 20) List<UUID> topNoteIds,
  @Size(max = 20) List<UUID> middleNoteIds,
  @Size(max = 20) List<UUID> baseNoteIds
) {}
