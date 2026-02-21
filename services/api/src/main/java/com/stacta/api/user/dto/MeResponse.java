package com.stacta.api.user.dto;

import com.stacta.api.collection.dto.CollectionItemDto;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MeResponse(
  UUID id,
  String cognitoSub,
  String username,
  String displayName,
  String bio,
  String avatarUrl,
  boolean isVerified,
  boolean isPrivate,
  long followersCount,
  long followingCount,
  double creatorRatingAverage,
  long creatorRatingCount,
  long collectionCount,
  long reviewCount,
  long communityFragranceCount,
  List<CollectionItemDto> collectionItems,
  List<CollectionItemDto> topFragrances,
  List<CollectionItemDto> communityFragrances,
  Instant createdAt,
  Instant updatedAt
) {}
