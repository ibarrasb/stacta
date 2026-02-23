package com.stacta.api.fragrance.dto;

import java.util.List;

public record CommunityFragranceVoteSummaryResponse(
  long voters,
  List<RankingDto> longevityRanking,
  List<RankingDto> sillageRanking,
  List<RankingDto> seasonRanking,
  List<RankingDto> occasionRanking,
  List<RankingDto> priceRanking,
  CommunityFragranceVoteSelection userVote
) {}

