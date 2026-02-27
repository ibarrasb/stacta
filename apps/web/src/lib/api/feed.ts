import { authedFetch } from "@/lib/api/client";
import type { FeedPage } from "@/lib/api/types";

export type FeedTab = "FOLLOWING" | "POPULAR";
export type FeedFilter = "ALL" | "REVIEW_POSTED" | "COLLECTION_ITEM_ADDED" | "WISHLIST_ITEM_ADDED" | "USER_FOLLOWED_USER" | "REVIEW_REPOSTED";

export function listFeed(params: { tab: FeedTab; filter: FeedFilter; limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  query.set("tab", params.tab);
  query.set("filter", params.filter);
  query.set("limit", String(params.limit ?? 20));
  if (params.cursor) query.set("cursor", params.cursor);
  return authedFetch<FeedPage>(`/api/v1/feed?${query.toString()}`);
}

export function listMyReviewFeed(params?: { limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  query.set("limit", String(params?.limit ?? 20));
  if (params?.cursor) query.set("cursor", params.cursor);
  return authedFetch<FeedPage>(`/api/v1/feed/me/reviews?${query.toString()}`);
}

export function listUserReviewFeed(username: string, params?: { limit?: number; cursor?: string }) {
  const query = new URLSearchParams();
  query.set("limit", String(params?.limit ?? 20));
  if (params?.cursor) query.set("cursor", params.cursor);
  return authedFetch<FeedPage>(`/api/v1/feed/users/${encodeURIComponent(username)}/reviews?${query.toString()}`);
}
