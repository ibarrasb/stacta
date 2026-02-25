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
  double creatorRatingAverage,
  long creatorRatingCount,
  Integer viewerCreatorRating,
  long collectionCount,
  long wishlistCount,
  long reviewCount,
  long communityFragranceCount,
  List<CollectionItemDto> collectionItems,
  List<CollectionItemDto> wishlistItems,
  List<CollectionItemDto> topFragrances,
  List<CollectionItemDto> communityFragrances,
  boolean isFollowing,
  boolean followRequested
) {}
