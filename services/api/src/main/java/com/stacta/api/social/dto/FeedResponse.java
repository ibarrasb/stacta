package com.stacta.api.social.dto;

import java.util.List;

public record FeedResponse(
  List<FeedItem> items,
  String nextCursor
) {}
