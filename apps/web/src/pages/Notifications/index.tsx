import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { acceptFollowRequest, declineFollowRequest, listPendingFollowRequests } from "@/lib/api/follows";
import { listNotifications } from "@/lib/api/notifications";
import type { NotificationItem, PendingFollowRequestItem } from "@/lib/api/types";

function when(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFollowRequestItem[]>([]);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pendingCursor, setPendingCursor] = useState<string | null>(null);
  const [notificationsCursor, setNotificationsCursor] = useState<string | null>(null);
  const [loadingMorePending, setLoadingMorePending] = useState(false);
  const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingType, setActingType] = useState<"accept" | "decline" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingPage, notificationsPage] = await Promise.all([
        listPendingFollowRequests({ limit: 20 }),
        listNotifications({ limit: 20 }),
      ]);
      setPending(pendingPage.items);
      setItems(notificationsPage.items);
      setPendingCursor(pendingPage.nextCursor);
      setNotificationsCursor(notificationsPage.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onAccept(requestId: string) {
    setActingId(requestId);
    setActingType("accept");
    setError(null);
    try {
      await acceptFollowRequest(requestId);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to accept follow request.");
    } finally {
      setActingId(null);
      setActingType(null);
    }
  }

  async function onDecline(requestId: string) {
    setActingId(requestId);
    setActingType("decline");
    setError(null);
    try {
      await declineFollowRequest(requestId);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to decline follow request.");
    } finally {
      setActingId(null);
      setActingType(null);
    }
  }

  async function loadMorePending() {
    if (!pendingCursor || loadingMorePending) return;
    setLoadingMorePending(true);
    setError(null);
    try {
      const page = await listPendingFollowRequests({ limit: 20, cursor: pendingCursor });
      setPending((prev) => [...prev, ...page.items]);
      setPendingCursor(page.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load more pending requests.");
    } finally {
      setLoadingMorePending(false);
    }
  }

  async function loadMoreNotifications() {
    if (!notificationsCursor || loadingMoreNotifications) return;
    setLoadingMoreNotifications(true);
    setError(null);
    try {
      const page = await listNotifications({ limit: 20, cursor: notificationsCursor });
      setItems((prev) => [...prev, ...page.items]);
      setNotificationsCursor(page.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load more notifications.");
    } finally {
      setLoadingMoreNotifications(false);
    }
  }

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-7 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
            <p className="mt-1 text-sm text-white/60">
              Follow requests and recent activity.
            </p>
          </div>
          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
            onClick={() => navigate("/home")}
          >
            Back
          </Button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
            <div className="mb-4">
              <div className="text-lg font-semibold">Pending requests</div>
              <div className="mt-1 text-xs text-white/60">Approve people who want to follow you.</div>
            </div>

            {loading ? (
              <div className="text-sm text-white/60">Loading...</div>
            ) : pending.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                No pending follow requests.
              </div>
            ) : (
              <div className="space-y-2">
                {pending.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
                  >
                    <button
                      className="min-w-0 text-left"
                      onClick={() =>
                        navigate(`/u/${req.username}`, {
                          state: { from: { pathname: "/notifications" } },
                        })
                      }
                    >
                      <div className="truncate text-sm font-semibold text-white">
                        {req.displayName || req.username}
                      </div>
                      <div className="truncate text-xs text-white/60">@{req.username}</div>
                      <div className="mt-0.5 text-[11px] text-white/45">{when(req.requestedAt)}</div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="h-9 rounded-xl border border-white/12 bg-white/10 px-3 text-white hover:bg-white/15"
                        disabled={actingId === req.id}
                        onClick={() => onDecline(req.id)}
                      >
                        {actingId === req.id && actingType === "decline" ? "Declining..." : "Decline"}
                      </Button>
                      <Button
                        className="h-9 rounded-xl px-3"
                        disabled={actingId === req.id}
                        onClick={() => onAccept(req.id)}
                      >
                        {actingId === req.id && actingType === "accept" ? "Accepting..." : "Accept"}
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingCursor && (
                  <Button
                    variant="secondary"
                    className="mt-2 h-9 w-full rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                    disabled={loadingMorePending}
                    onClick={loadMorePending}
                  >
                    {loadingMorePending ? "Loading..." : "Load more"}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
            <div className="mb-4">
              <div className="text-lg font-semibold">Activity</div>
              <div className="mt-1 text-xs text-white/60">People who recently followed you.</div>
            </div>

            {loading ? (
              <div className="text-sm text-white/60">Loading...</div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                No notifications yet.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <button
                      className="text-left"
                      onClick={() =>
                        navigate(`/u/${item.actorUsername}`, {
                          state: { from: { pathname: "/notifications" } },
                        })
                      }
                    >
                      <div className="text-sm text-white/85">
                        <span className="font-semibold">{item.actorDisplayName || item.actorUsername}</span>{" "}
                        {item.followedBack ? "followed you back" : "followed you"}
                      </div>
                      <div className="text-xs text-white/55">
                        @{item.actorUsername} • {when(item.createdAt)}
                      </div>
                    </button>
                    {idx < items.length - 1 && <Separator className="mt-3 bg-white/10" />}
                  </div>
                ))}
                {notificationsCursor && (
                  <Button
                    variant="secondary"
                    className="mt-2 h-9 w-full rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                    disabled={loadingMoreNotifications}
                    onClick={loadMoreNotifications}
                  >
                    {loadingMoreNotifications ? "Loading..." : "Load more"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
