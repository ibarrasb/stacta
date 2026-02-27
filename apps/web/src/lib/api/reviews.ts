import { authedFetch } from "@/lib/api/client";
import type { ReviewCommentItem, ReviewThreadResponse } from "@/lib/api/types";

export type SubmitReviewRequest = {
  source: "FRAGELLA" | "COMMUNITY";
  externalId: string;
  fragranceName: string;
  fragranceBrand?: string | null;
  fragranceImageUrl?: string | null;
  rating: number;
  excerpt: string;
  performance?: Record<string, number>;
  season?: Record<string, number>;
  occasion?: Record<string, number>;
};

export function submitReview(body: SubmitReviewRequest) {
  return authedFetch<void>("/api/v1/reviews", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteReview(reviewId: string) {
  return authedFetch<void>(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
  });
}

export type ReviewLikeResponse = {
  likesCount: number;
  viewerHasLiked: boolean;
};

export function likeReview(reviewId: string) {
  return authedFetch<ReviewLikeResponse>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/like`, {
    method: "PUT",
  });
}

export function unlikeReview(reviewId: string) {
  return authedFetch<ReviewLikeResponse>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/like`, {
    method: "DELETE",
  });
}

export function getReviewThread(reviewId: string) {
  return authedFetch<ReviewThreadResponse>(`/api/v1/reviews/${encodeURIComponent(reviewId)}`);
}

export type CreateReviewCommentRequest = {
  body: string;
  parentCommentId?: string | null;
};

export function listReviewComments(reviewId: string) {
  return authedFetch<ReviewCommentItem[]>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/comments`);
}

export function createReviewComment(reviewId: string, body: CreateReviewCommentRequest) {
  return authedFetch<ReviewCommentItem>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteReviewComment(reviewId: string, commentId: string) {
  return authedFetch<void>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
}

export type ReportReviewCommentRequest = {
  reason: "SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "OTHER";
  details?: string | null;
};

export function reportReviewComment(reviewId: string, commentId: string, body: ReportReviewCommentRequest) {
  return authedFetch<void>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/comments/${encodeURIComponent(commentId)}/report`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
