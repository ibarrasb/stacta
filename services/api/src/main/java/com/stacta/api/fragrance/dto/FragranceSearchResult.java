package com.stacta.api.fragrance.dto;

import java.util.List;

public record FragranceSearchResult(
  String source,
  String externalId,
  String name,
  String brand,
  String year,
  String imageUrl,
  String gender,
  String rating,
  String price,
  String priceValue,
  List<String> mainAccords,
  List<String> generalNotes,
  NotesDto notes,
  String purchaseUrl
) {}
