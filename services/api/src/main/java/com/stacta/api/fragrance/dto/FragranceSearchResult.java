package com.stacta.api.fragrance.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record FragranceSearchResult(
  String source,
  String externalId,

  String name,
  String brand,
  String year,
  String imageUrl,
  String imageObjectKey,
  String gender,

  String rating,
  String price,
  String priceValue,

  String oilType,
  String longevity,
  String sillage,
  String confidence,
  String popularity,

  Map<String, String> mainAccordsPercentage,
  List<RankingDto> seasonRanking,
  List<RankingDto> occasionRanking,

  List<String> mainAccords,
  List<String> generalNotes,
  NotesDto notes,
  String purchaseUrl,

  //community-only (nullable for FRAGELLA)
  String concentration,
  Integer longevityScore,
  Integer sillageScore,
  String visibility,
  UUID createdByUserId,
  String createdByUsername,
  Long ratingCount,
  Integer userRating
) {}
