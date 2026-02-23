package com.stacta.api.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ResolveNoteReportRequest(
  @NotBlank @Size(max = 40) String action, // DISMISS | MERGE_INTO
  UUID targetNoteId,
  @Size(max = 500) String resolutionNote
) {}
