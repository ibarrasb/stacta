package com.stacta.api.social;

import com.stacta.api.social.dto.CreateReviewRequest;
import com.stacta.api.social.dto.CreateReviewCommentRequest;
import com.stacta.api.social.dto.ReportReviewCommentRequest;
import com.stacta.api.social.dto.ReviewCommentItem;
import com.stacta.api.social.dto.ReviewLikeResponse;
import com.stacta.api.social.dto.ReviewRepostResponse;
import com.stacta.api.social.dto.ReviewThreadResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reviews")
public class ReviewController {

  private final ReviewService reviewService;
  private final ReviewCommentService reviewComments;

  public ReviewController(ReviewService reviewService, ReviewCommentService reviewComments) {
    this.reviewService = reviewService;
    this.reviewComments = reviewComments;
  }

  @PostMapping
  public void submit(
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody CreateReviewRequest request
  ) {
    reviewService.submit(jwt.getSubject(), request);
  }

  @DeleteMapping("/{reviewId}")
  public void delete(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId
  ) {
    reviewService.delete(jwt.getSubject(), reviewId);
  }

  @PutMapping("/{reviewId}/like")
  public ReviewLikeResponse like(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId
  ) {
    return reviewService.like(jwt.getSubject(), reviewId);
  }

  @DeleteMapping("/{reviewId}/like")
  public ReviewLikeResponse unlike(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId
  ) {
    return reviewService.unlike(jwt.getSubject(), reviewId);
  }

  @PutMapping("/{reviewId}/repost")
  public ReviewRepostResponse repost(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId
  ) {
    return reviewService.repost(jwt.getSubject(), reviewId);
  }

  @DeleteMapping("/{reviewId}/repost")
  public ReviewRepostResponse unrepost(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId
  ) {
    return reviewService.unrepost(jwt.getSubject(), reviewId);
  }

  @GetMapping("/{reviewId}")
  public ReviewThreadResponse thread(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId
  ) {
    return reviewComments.thread(jwt.getSubject(), reviewId);
  }

  @GetMapping("/{reviewId}/comments")
  public List<ReviewCommentItem> comments(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId
  ) {
    return reviewComments.listComments(jwt.getSubject(), reviewId);
  }

  @PostMapping("/{reviewId}/comments")
  public ReviewCommentItem createComment(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId,
    @Valid @RequestBody CreateReviewCommentRequest request
  ) {
    return reviewComments.createComment(jwt.getSubject(), reviewId, request.body(), request.parentCommentId());
  }

  @DeleteMapping("/{reviewId}/comments/{commentId}")
  public void deleteComment(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId,
    @PathVariable("commentId") UUID commentId
  ) {
    reviewComments.deleteComment(jwt.getSubject(), reviewId, commentId);
  }

  @PostMapping("/{reviewId}/comments/{commentId}/report")
  public void reportComment(
    @AuthenticationPrincipal Jwt jwt,
    @PathVariable("reviewId") UUID reviewId,
    @PathVariable("commentId") UUID commentId,
    @Valid @RequestBody ReportReviewCommentRequest request
  ) {
    reviewComments.reportComment(jwt.getSubject(), reviewId, commentId, request.reason(), request.details());
  }
}
