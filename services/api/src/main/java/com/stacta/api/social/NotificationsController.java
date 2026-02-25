package com.stacta.api.social;

import com.stacta.api.social.dto.NotificationsResponse;
import com.stacta.api.social.dto.UnreadNotificationsResponse;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationsController {

  private final FollowService followService;

  public NotificationsController(FollowService followService) {
    this.followService = followService;
  }

  @GetMapping
  public NotificationsResponse list(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam(name = "limit", defaultValue = "30") int limit,
    @RequestParam(name = "cursor", required = false) String cursor
  ) {
    NotificationsResponse page = followService.notifications(jwt.getSubject(), limit, cursor);
    followService.markNotificationsSeen(jwt.getSubject());
    return page;
  }

  @GetMapping("/unread-count")
  public UnreadNotificationsResponse unreadCount(@AuthenticationPrincipal Jwt jwt) {
    return followService.unreadCount(jwt.getSubject());
  }

  @DeleteMapping("/{notificationId}")
  public ResponseEntity<Void> deleteNotification(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("notificationId") UUID notificationId
  ) {
    boolean deleted = followService.deleteNotification(jwt.getSubject(), notificationId);
    if (!deleted) {
      return ResponseEntity.notFound().build();
    }
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/read")
  public ResponseEntity<Void> clearRead(@AuthenticationPrincipal Jwt jwt) {
    followService.clearReadNotifications(jwt.getSubject());
    return ResponseEntity.noContent().build();
  }
}
