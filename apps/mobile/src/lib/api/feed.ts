import { authedFetch } from "./client";
import type { FeedPage } from "./types";

export function listMyReviewFeed(params?: { limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  query.set("limit", String(params?.limit ?? 20));
  if (params?.cursor) query.set("cursor", params.cursor);
  return authedFetch<FeedPage>(`/api/v1/feed/me/reviews?${query.toString()}`);
}
