package com.stacta.api.fragrance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

public record RateFragranceRequest(
  @DecimalMin("1.0") @DecimalMax("5.0") Double rating
) {}
