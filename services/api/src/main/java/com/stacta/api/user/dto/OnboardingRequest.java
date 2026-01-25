package com.stacta.api.user.dto;

import jakarta.validation.constraints.NotBlank;

public record OnboardingRequest(
  @NotBlank String displayName,
  String username
) {}
