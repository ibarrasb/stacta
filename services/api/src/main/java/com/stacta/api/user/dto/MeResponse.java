package com.stacta.api.user.dto;

import java.time.Instant;
import java.util.UUID;

public record MeResponse(
  UUID id,
  String cognitoSub,
  String username,
  String displayName,
  String bio,
  String avatarUrl,
  Instant createdAt,
  Instant updatedAt
) {}

