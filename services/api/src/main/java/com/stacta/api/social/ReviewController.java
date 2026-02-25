package com.stacta.api.social;

import com.stacta.api.social.dto.CreateReviewRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

  private final ReviewService reviewService;

  public ReviewController(ReviewService reviewService) {
    this.reviewService = reviewService;
  }

  @PostMapping
  public void submit(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody CreateReviewRequest request
  ) {
    reviewService.submit(jwt.getSubject(), request);
  }
}
