package com.stacta.api.fragrance.dto;

import java.time.Instant;
import java.util.UUID;

public record FragranceReportItemDto(
  UUID id,
  UUID fragranceId,
  String fragranceExternalId,
  String fragranceName,
  String fragranceBrand,
  String creatorUsername,
  UUID creatorUserId,
  String reportedByUsername,
  String reportedByDisplayName,
  String reason,
  String details,
  String status,
  String resolutionNote,
  String resolvedByUsername,
  Instant createdAt,
  Instant resolvedAt
) {}
