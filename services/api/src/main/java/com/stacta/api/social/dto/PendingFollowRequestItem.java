package com.stacta.api.social.dto;

import java.time.Instant;
import java.util.UUID;

public record PendingFollowRequestItem(
  UUID id,
  String username,
  String displayName,
  String avatarUrl,
  Instant requestedAt
) {}
