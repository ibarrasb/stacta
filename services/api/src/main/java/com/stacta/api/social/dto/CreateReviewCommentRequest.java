package com.stacta.api.social.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateReviewCommentRequest(
  @NotBlank @Size(max = 1200) String body,
  UUID parentCommentId
) {}
