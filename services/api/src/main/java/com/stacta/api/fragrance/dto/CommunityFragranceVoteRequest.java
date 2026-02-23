package com.stacta.api.fragrance.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;

public record CommunityFragranceVoteRequest(
  @Min(1) @Max(5) Integer longevityScore,
  @Min(1) @Max(5) Integer sillageScore,
  String pricePerception,
  List<String> seasonVotes,
  List<String> occasionVotes
) {}

