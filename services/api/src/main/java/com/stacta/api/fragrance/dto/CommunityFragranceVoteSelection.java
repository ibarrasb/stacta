package com.stacta.api.fragrance.dto;

import java.util.List;

public record CommunityFragranceVoteSelection(
  Integer longevityScore,
  Integer sillageScore,
  String pricePerception,
  List<String> seasonVotes,
  List<String> occasionVotes
) {}

