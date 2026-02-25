package com.stacta.api.social.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record CreateReviewRequest(
  @NotBlank String source,
  @NotBlank String externalId,
  @NotBlank String fragranceName,
  String fragranceBrand,
  String fragranceImageUrl,
  @NotNull @Min(1) @Max(5) Integer rating,
  @NotBlank String excerpt,
  Map<String, Integer> performance,
  Map<String, Integer> season,
  Map<String, Integer> occasion
) {}
