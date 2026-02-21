package com.stacta.api.user.dto;

public record CreatorRatingSummary(
  double average,
  long count,
  Integer userRating
) {}
