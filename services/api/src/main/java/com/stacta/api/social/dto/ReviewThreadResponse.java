package com.stacta.api.social.dto;

import java.util.List;

public record ReviewThreadResponse(
  FeedItem review,
  List<ReviewCommentItem> comments
) {}
