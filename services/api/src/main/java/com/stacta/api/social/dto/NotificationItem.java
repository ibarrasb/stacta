package com.stacta.api.social.dto;

import java.time.Instant;
import java.util.UUID;

public record NotificationItem(
  UUID id,
  String type,
  String actorUsername,
  String actorDisplayName,
  String actorAvatarUrl,
  Instant createdAt,
  boolean followedBack
) {}
