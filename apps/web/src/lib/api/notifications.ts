import { authedFetch } from "@/lib/api/client";
import type { NotificationsPage } from "@/lib/api/types";

export function listNotifications(params: { limit?: number; cursor?: string } = {}) {
  const limit = params.limit ?? 30;
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (params.cursor) query.set("cursor", params.cursor);
  return authedFetch<NotificationsPage>(`/api/v1/notifications?${query.toString()}`);
}

export function getUnreadNotificationsCount() {
  return authedFetch<{ count: number }>("/api/v1/notifications/unread-count");
}
