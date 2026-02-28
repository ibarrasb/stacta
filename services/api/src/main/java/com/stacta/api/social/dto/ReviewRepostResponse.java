package com.stacta.api.social.dto;

public record ReviewRepostResponse(
  int repostsCount,
  boolean viewerHasReposted
) {}
