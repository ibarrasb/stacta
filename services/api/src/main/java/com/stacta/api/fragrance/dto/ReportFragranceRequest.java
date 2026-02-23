package com.stacta.api.fragrance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportFragranceRequest(
  @NotBlank @Size(max = 40) String reason,
  @Size(max = 500) String details
) {}
