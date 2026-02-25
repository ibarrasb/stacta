import { authedFetch } from "@/lib/api/client";

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
