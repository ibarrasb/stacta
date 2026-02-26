package com.stacta.api.collection.dto;

import jakarta.validation.constraints.NotBlank;

public record AddCollectionItemRequest(
  @NotBlank String source,
  @NotBlank String externalId,
  @NotBlank String name,
  String brand,
  String imageUrl,
  String collectionTag
) {}
