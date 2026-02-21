package com.stacta.api.user;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.stacta.api.user.dto.CreatorRatingSummary;
import com.stacta.api.user.dto.RateCreatorRequest;
import com.stacta.api.user.dto.UserProfileResponse;
import com.stacta.api.user.dto.UserSearchItem;

@RestController
@RequestMapping("/api/v1/users")
public class UserDiscoveryController {

  private final UserService userService;
  private final CreatorRatingService creatorRatingService;

  public UserDiscoveryController(UserService userService, CreatorRatingService creatorRatingService) {
    this.userService = userService;
    this.creatorRatingService = creatorRatingService;
  }

  @GetMapping("/search")
  public List<UserSearchItem> search(
    @RequestParam(name = "q", defaultValue = "") String q,
    @RequestParam(name = "limit", defaultValue = "10") int limit,
    @AuthenticationPrincipal Jwt jwt
  ) {
    return userService.searchUsers(q, jwt.getSubject(), limit);
  }

  @GetMapping("/{username}")
  public UserProfileResponse profile(
    @PathVariable String username,
    @AuthenticationPrincipal Jwt jwt
  ) {
    return userService.getProfile(jwt.getSubject(), username);
  }

  @GetMapping("/{username}/creator-rating")
  public CreatorRatingSummary creatorRating(
    @PathVariable String username,
    @AuthenticationPrincipal Jwt jwt
  ) {
    String viewerSub = jwt == null ? null : jwt.getSubject();
    return creatorRatingService.getSummary(viewerSub, username);
  }

  @PostMapping("/{username}/creator-rating")
  public CreatorRatingSummary rateCreator(
    @PathVariable String username,
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody RateCreatorRequest req
  ) {
    if (req == null || req.rating() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rating is required");
    }
    return creatorRatingService.upsertRating(jwt.getSubject(), username, req.rating());
  }
}
