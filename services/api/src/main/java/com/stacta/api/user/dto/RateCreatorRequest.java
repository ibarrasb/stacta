package com.stacta.api.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record RateCreatorRequest(
  @Min(1) @Max(5) Integer rating
) {}
