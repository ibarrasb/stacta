package com.stacta.api.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportNoteRequest(
  @NotBlank @Size(max = 40) String reason,
  @Size(max = 500) String details
) {}
