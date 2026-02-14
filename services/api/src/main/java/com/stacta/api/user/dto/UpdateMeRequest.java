package com.stacta.api.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
  @NotBlank @Size(max = 120) String displayName,
  @Size(max = 500) String bio
) {}
