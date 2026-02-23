package com.stacta.api.fragrance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolveFragranceReportRequest(
  @NotBlank @Size(max = 40) String action, // DISMISS | DELETE_FRAGRANCE
  @Size(max = 500) String resolutionNote
) {}
