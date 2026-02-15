package com.stacta.api.social.dto;

import java.util.List;

public record PendingFollowRequestsResponse(
  List<PendingFollowRequestItem> items,
  String nextCursor
) {}
