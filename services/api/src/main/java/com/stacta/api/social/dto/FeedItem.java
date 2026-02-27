package com.stacta.api.social.dto;

import java.time.Instant;
import java.util.UUID;

public record FeedItem(
  UUID id,
  String type,
  String actorUsername,
  String actorDisplayName,
  String actorAvatarUrl,
  String targetUsername,
  String targetDisplayName,
  String fragranceName,
  String fragranceSource,
  String fragranceExternalId,
  String fragranceImageUrl,
  String collectionTag,
  Integer reviewRating,
  String reviewExcerpt,
  String reviewPerformance,
  String reviewSeason,
  String reviewOccasion,
  int likesCount,
  int commentsCount,
  int repostsCount,
  boolean viewerHasLiked,
  Instant createdAt
) {}
