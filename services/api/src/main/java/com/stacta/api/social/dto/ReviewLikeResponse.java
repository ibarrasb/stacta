package com.stacta.api.social.dto;

public record ReviewLikeResponse(
  int likesCount,
  boolean viewerHasLiked
) {}
