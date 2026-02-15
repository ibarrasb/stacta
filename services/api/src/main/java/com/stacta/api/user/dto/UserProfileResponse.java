package com.stacta.api.user.dto;

public record UserProfileResponse(
  String username,
  String displayName,
  String avatarUrl,
  String bio,
  boolean isPrivate,
  boolean isOwner,
  boolean isVisible
) {}
