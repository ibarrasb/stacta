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
  String reviewExcerpt,
  int likesCount,
  int commentsCount,
  int repostsCount,
  Instant createdAt
) {}
