package com.stacta.api.social.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportReviewCommentRequest(
  @NotBlank @Size(max = 32) String reason,
  @Size(max = 1000) String details
) {}
