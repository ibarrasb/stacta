package com.stacta.api.user;

import java.util.Map;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import com.stacta.api.user.dto.MeResponse;
import com.stacta.api.user.dto.OnboardingRequest;

@RestController
@RequestMapping("/api/v1")
public class MeController {

  private final UserService userService;

  public MeController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(@AuthenticationPrincipal Jwt jwt) {
    String sub = jwt.getSubject();
    return userService.getMe(sub)
      .<ResponseEntity<?>>map(ResponseEntity::ok)
      .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "NOT_ONBOARDED")));
  }

  @PostMapping("/onboarding")
  public MeResponse onboarding(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody OnboardingRequest req) {
    return userService.upsertOnboarding(jwt.getSubject(), req);
  }
}
