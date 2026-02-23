package com.stacta.api.note.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record IssueUserStrikeRequest(
  @NotNull UUID userId,
  UUID noteReportId,
  @NotBlank @Size(max = 500) String reason,
  @Min(1) @Max(10) Integer points
) {}
