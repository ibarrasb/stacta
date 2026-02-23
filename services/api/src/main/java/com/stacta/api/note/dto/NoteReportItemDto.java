package com.stacta.api.note.dto;

import java.time.Instant;
import java.util.UUID;

public record NoteReportItemDto(
  UUID id,
  UUID noteId,
  String noteName,
  int noteUsageCount,
  String reportedByUsername,
  String reportedByDisplayName,
  String reason,
  String details,
  String status,
  UUID mergedIntoNoteId,
  String mergedIntoNoteName,
  String resolutionNote,
  String resolvedByUsername,
  Instant createdAt,
  Instant resolvedAt
) {}
