package com.stacta.api.collection.dto;

import java.time.Instant;

public record CollectionItemDto(
  String source,
  String externalId,
  String name,
  String brand,
  String imageUrl,
  String collectionTag,
  Instant addedAt
) {}
