package com.stacta.api.user.dto;

public record UserSearchItem(
  String username,
  String displayName,
  String avatarUrl,
  boolean isPrivate
) {}
