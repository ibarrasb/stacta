import { authedFetch } from "./client";

export type ReviewLikeResponse = {
  likesCount: number;
  viewerHasLiked: boolean;
};

export type ReviewRepostResponse = {
  repostsCount: number;
  viewerHasReposted: boolean;
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

export function repostReview(reviewId: string) {
  return authedFetch<ReviewRepostResponse>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/repost`, {
    method: "PUT",
  });
}

export function unrepostReview(reviewId: string) {
  return authedFetch<ReviewRepostResponse>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/repost`, {
    method: "DELETE",
  });
}

export function deleteReview(reviewId: string) {
  return authedFetch<void>(`/api/v1/reviews/${encodeURIComponent(reviewId)}`, {
    method: "DELETE",
  });
}

export function reportReview(reviewId: string, body: { reason: "SPAM" | "INAPPROPRIATE" | "HARASSMENT" | "OTHER"; details?: string | null }) {
  return authedFetch<void>(`/api/v1/reviews/${encodeURIComponent(reviewId)}/report`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
