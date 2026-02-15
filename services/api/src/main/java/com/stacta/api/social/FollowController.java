package com.stacta.api.social;

import com.stacta.api.social.dto.FollowActionResponse;
import com.stacta.api.social.dto.PendingFollowRequestsResponse;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/follows")
public class FollowController {

  private final FollowService followService;

  public FollowController(FollowService followService) {
    this.followService = followService;
  }

  @PostMapping("/{username}")
  public FollowActionResponse follow(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable String username
  ) {
    return followService.followByUsername(jwt.getSubject(), username);
  }

  @DeleteMapping("/{username}")
  public ResponseEntity<?> unfollow(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable String username
  ) {
    followService.unfollowByUsername(jwt.getSubject(), username);
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @GetMapping("/requests")
  public PendingFollowRequestsResponse pending(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam(name = "limit", defaultValue = "20") int limit,
    @RequestParam(name = "cursor", required = false) String cursor
  ) {
    return followService.pendingRequests(jwt.getSubject(), limit, cursor);
  }

  @PostMapping("/requests/{requestId}/accept")
  public ResponseEntity<?> accept(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable UUID requestId
  ) {
    followService.acceptRequest(jwt.getSubject(), requestId);
    return ResponseEntity.ok(Map.of("ok", true));
  }

  @PostMapping("/requests/{requestId}/decline")
  public ResponseEntity<?> decline(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable UUID requestId
  ) {
    followService.declineRequest(jwt.getSubject(), requestId);
    return ResponseEntity.ok(Map.of("ok", true));
  }
}
