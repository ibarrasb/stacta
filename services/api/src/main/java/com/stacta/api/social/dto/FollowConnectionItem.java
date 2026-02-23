package com.stacta.api.social.dto;

import java.time.Instant;

public record FollowConnectionItem(
  String username,
  String displayName,
  String avatarUrl,
  boolean isPrivate,
  boolean isFollowing,
  boolean followsYou,
  Instant followedAt
) {}
