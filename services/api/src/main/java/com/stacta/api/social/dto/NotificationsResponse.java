package com.stacta.api.social.dto;

import java.util.List;

public record NotificationsResponse(
  List<NotificationItem> items,
  String nextCursor
) {}
