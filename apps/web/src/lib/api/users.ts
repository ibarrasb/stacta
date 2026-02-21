import { authedFetch } from "@/lib/api/client";
import type { CreatorRatingSummary, UserProfileResponse, UserSearchItem } from "@/lib/api/types";

export function searchUsers(params: { q: string; limit?: number }, init: RequestInit = {}) {
  const q = encodeURIComponent(params.q ?? "");
  const limit = Math.max(1, Math.min(params.limit ?? 10, 20));
  return authedFetch<UserSearchItem[]>(`/api/v1/users/search?q=${q}&limit=${limit}`, init);
}

export function getUserProfile(username: string, init: RequestInit = {}) {
  return authedFetch<UserProfileResponse>(`/api/v1/users/${encodeURIComponent(username)}`, init);
}

export function getCreatorRatingSummary(username: string, init: RequestInit = {}) {
  return authedFetch<CreatorRatingSummary>(`/api/v1/users/${encodeURIComponent(username)}/creator-rating`, init);
}

export function rateCreator(username: string, rating: number) {
  return authedFetch<CreatorRatingSummary>(`/api/v1/users/${encodeURIComponent(username)}/creator-rating`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
}
