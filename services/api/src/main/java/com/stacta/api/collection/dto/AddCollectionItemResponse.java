package com.stacta.api.collection.dto;

public record AddCollectionItemResponse(
  CollectionItemDto item,
  String status
) {}
