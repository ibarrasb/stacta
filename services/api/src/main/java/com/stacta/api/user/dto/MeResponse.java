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
  long collectionCount,
  long reviewCount,
  long communityFragranceCount,
  List<CollectionItemDto> collectionItems,
  List<CollectionItemDto> topFragrances,
  Instant createdAt,
  Instant updatedAt
) {}
