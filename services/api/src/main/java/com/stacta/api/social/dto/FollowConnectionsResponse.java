package com.stacta.api.social.dto;

import java.util.List;

public record FollowConnectionsResponse(
  List<FollowConnectionItem> items,
  String nextCursor
) {}
