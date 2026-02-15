import { authedFetch } from "@/lib/api/client";
import type { FollowActionResponse, PendingFollowRequestsPage } from "@/lib/api/types";

export function followUser(username: string) {
  return authedFetch<FollowActionResponse>(`/api/v1/follows/${encodeURIComponent(username)}`, {
    method: "POST",
  });
}

export function unfollowUser(username: string) {
  return authedFetch<{ ok: boolean }>(`/api/v1/follows/${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
}

export function listPendingFollowRequests(params: { limit?: number; cursor?: string } = {}) {
  const limit = params.limit ?? 20;
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (params.cursor) query.set("cursor", params.cursor);
  return authedFetch<PendingFollowRequestsPage>(`/api/v1/follows/requests?${query.toString()}`);
}

export function acceptFollowRequest(requestId: string) {
  return authedFetch<{ ok: boolean }>(`/api/v1/follows/requests/${encodeURIComponent(requestId)}/accept`, {
    method: "POST",
  });
}

export function declineFollowRequest(requestId: string) {
  return authedFetch<{ ok: boolean }>(`/api/v1/follows/requests/${encodeURIComponent(requestId)}/decline`, {
    method: "POST",
  });
}
