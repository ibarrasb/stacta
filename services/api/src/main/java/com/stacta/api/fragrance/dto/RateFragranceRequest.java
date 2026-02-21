package com.stacta.api.fragrance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record RateFragranceRequest(
  @Min(1) @Max(5) Integer rating
) {}
