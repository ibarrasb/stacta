package com.stacta.api.fragrance.dto;

public record FragranceRatingSummary(
  double average,
  long count,
  Double userRating
) {}
