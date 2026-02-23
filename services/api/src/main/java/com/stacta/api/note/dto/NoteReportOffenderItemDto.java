package com.stacta.api.note.dto;

import java.util.UUID;

public record NoteReportOffenderItemDto(
  UUID userId,
  String username,
  String displayName,
  int fragranceCount,
  int strikeCount
) {}
