package com.stacta.api.social.dto;

import java.time.Instant;
import java.util.UUID;

public record ReviewCommentItem(
  UUID id,
  UUID reviewId,
  UUID parentCommentId,
  String authorUsername,
  String authorDisplayName,
  String authorAvatarUrl,
  String body,
  Instant createdAt,
  boolean viewerCanDelete
) {}
