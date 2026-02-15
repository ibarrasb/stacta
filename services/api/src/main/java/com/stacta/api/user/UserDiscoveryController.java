package com.stacta.api.user;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.stacta.api.user.dto.UserProfileResponse;
import com.stacta.api.user.dto.UserSearchItem;

@RestController
@RequestMapping("/api/v1/users")
public class UserDiscoveryController {

  private final UserService userService;

  public UserDiscoveryController(UserService userService) {
    this.userService = userService;
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
}
