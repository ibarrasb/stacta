package com.stacta.api.user.dto;

import com.stacta.api.collection.dto.CollectionItemDto;
import java.util.List;

public record UserProfileResponse(
  String username,
  String displayName,
  String avatarUrl,
  String bio,
  boolean isVerified,
  boolean isPrivate,
  boolean isOwner,
  boolean isVisible,
  long followersCount,
  long followingCount,
  long collectionCount,
  long reviewCount,
  long communityFragranceCount,
  List<CollectionItemDto> collectionItems,
  List<CollectionItemDto> topFragrances,
  boolean isFollowing,
  boolean followRequested
) {}
