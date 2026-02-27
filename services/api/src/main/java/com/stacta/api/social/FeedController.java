package com.stacta.api.social;

import com.stacta.api.social.dto.FeedResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/feed")
public class FeedController {

  private final FeedService feedService;

  public FeedController(FeedService feedService) {
    this.feedService = feedService;
  }

  @GetMapping
  public FeedResponse list(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam(name = "tab", defaultValue = "FOLLOWING") String tab,
    @RequestParam(name = "filter", defaultValue = "ALL") String filter,
    @RequestParam(name = "limit", defaultValue = "20") int limit,
    @RequestParam(name = "cursor", required = false) String cursor
  ) {
    return feedService.list(jwt.getSubject(), tab, filter, limit, cursor);
  }

  @GetMapping("/me/reviews")
  public FeedResponse listMineReviews(
    @AuthenticationPrincipal Jwt jwt,
    @RequestParam(name = "limit", defaultValue = "20") int limit,
    @RequestParam(name = "cursor", required = false) String cursor
  ) {
    return feedService.listMineReviews(jwt.getSubject(), limit, cursor);
  }

  @GetMapping("/users/{username}/reviews")
  public FeedResponse listUserReviews(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("username") String username,
    @RequestParam(name = "limit", defaultValue = "20") int limit,
    @RequestParam(name = "cursor", required = false) String cursor
  ) {
    return feedService.listUserReviews(jwt.getSubject(), username, limit, cursor);
  }
}
