import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import { listPendingFollowRequests } from "@/lib/api/follows";
import { getMe } from "@/lib/api/me";
import { clearReadNotifications, deleteNotification, listNotifications } from "@/lib/api/notifications";
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
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<PendingFollowRequestItem[]>([]);
  const [hasMorePending, setHasMorePending] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [notificationsCursor, setNotificationsCursor] = useState<string | null>(null);
  const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);
  const [clearingRead, setClearingRead] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, notificationsPage] = await Promise.all([
        getMe(),
        listNotifications({ limit: 20 }),
      ]);
      setIsPrivateAccount(Boolean(me.isPrivate));
      setItems(notificationsPage.items);
      setNotificationsCursor(notificationsPage.nextCursor);

      if (me.isPrivate) {
        const pendingPage = await listPendingFollowRequests({ limit: 4 });
        setPendingPreview(pendingPage.items);
        setHasMorePending(Boolean(pendingPage.nextCursor));
      } else {
        setPendingPreview([]);
        setHasMorePending(false);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadLabel = useMemo(() => {
    if (items.length <= 0) return "No new activity yet";
    return `${items.length} recent activity event${items.length === 1 ? "" : "s"}`;
  }, [items.length]);

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

  async function onDeleteNotification(notificationId: string) {
    setDeletingNotificationId(notificationId);
    setError(null);
    try {
      await deleteNotification(notificationId);
      setItems((prev) => prev.filter((item) => item.id !== notificationId));
    } catch (e: any) {
      setError(e?.message || "Failed to delete notification.");
    } finally {
      setDeletingNotificationId(null);
    }
  }

  async function onClearRead() {
    setClearingRead(true);
    setError(null);
    try {
      await clearReadNotifications();
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to clear read notifications.");
    } finally {
      setClearingRead(false);
    }
  }

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-7xl px-4 pb-10">
        <div className="mb-5 rounded-3xl border border-white/15 bg-black/30 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Notification center</div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Your activity pulse</h1>
              <p className="mt-1 text-sm text-white/70">{unreadLabel}</p>
            </div>
            <Button
              variant="secondary"
              className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
              onClick={() => navigate("/home")}
            >
              Back home
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {isPrivateAccount ? (
          <section className="mb-5 rounded-3xl border border-white/15 bg-white/6 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Follow requests</h2>
                <p className="text-xs text-white/60">
                  {pendingPreview.length === 0
                    ? "No pending requests right now."
                    : `${hasMorePending ? "4+" : pendingPreview.length} pending request${pendingPreview.length === 1 && !hasMorePending ? "" : "s"}`}
                </p>
                {pendingPreview.length > 0 ? (
                  <p className="mt-2 text-sm text-white/80">
                    {pendingPreview.slice(0, 3).map((req) => req.displayName || req.username).join(", ")}
                    {pendingPreview.length > 3 || hasMorePending ? " and more" : ""}
                  </p>
                ) : null}
              </div>
              <Button
                variant="secondary"
                className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-white hover:bg-white/18"
                onClick={() => navigate("/notifications/requests")}
              >
                {pendingPreview.length > 0 ? "Review requests" : "Open requests"}
              </Button>
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/15 bg-white/6 p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">Activity feed</h2>
              <p className="text-xs text-white/60">Recent follows and follow-backs.</p>
            </div>
            <Button
              variant="secondary"
              className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-white hover:bg-white/18"
              disabled={loading || items.length === 0 || clearingRead}
              onClick={onClearRead}
            >
              {clearingRead ? (
                <span className="inline-flex items-center gap-2">
                  <InlineSpinner />
                  <span>Clearing</span>
                </span>
              ) : "Clear read"}
            </Button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/12 bg-black/25 p-6">
              <LoadingSpinner label="Loading activity..." />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white/65">
              No activity yet.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-white/12 bg-black/25 px-4 py-3"
                >
                  <button
                    className="min-w-0 flex-1 text-left transition hover:opacity-95"
                    onClick={() => {
                      if (item.type === "MODERATION_STRIKE") return;
                      navigate(`/u/${item.actorUsername}`, {
                        state: { from: { pathname: "/notifications" } },
                      });
                    }}
                  >
                    <div>
                      <div className="text-sm text-white/90">
                        <span className="font-semibold">{item.actorDisplayName || item.actorUsername}</span>{" "}
                        {item.type === "MODERATION_STRIKE"
                          ? "issued you a moderation strike. Continued violations may lead to account suspension."
                          : item.followedBack ? "followed you back" : "followed you"}
                      </div>
                      <div className="mt-1 text-xs text-white/55">
                        {item.type === "MODERATION_STRIKE" ? "Moderation" : `@${item.actorUsername}`} • {when(item.createdAt)}
                      </div>
                    </div>
                    <span className="rounded-full border border-amber-200/35 bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">
                      {item.type === "MODERATION_STRIKE"
                        ? "Strike"
                        : item.type === "FOLLOWED_YOU_BACK" ? "Followed back" : "Follow"}
                    </span>
                  </button>
                  <Button
                    variant="secondary"
                    className="h-8 shrink-0 rounded-lg border border-white/20 bg-white/10 px-2 text-xs text-white hover:bg-white/18"
                    disabled={deletingNotificationId === item.id}
                    onClick={() => onDeleteNotification(item.id)}
                  >
                    {deletingNotificationId === item.id ? (
                      <span className="inline-flex items-center gap-2">
                        <InlineSpinner />
                        <span>Deleting</span>
                      </span>
                    ) : "Delete"}
                  </Button>
                </div>
              ))}
              {notificationsCursor ? (
                <Button
                  variant="secondary"
                  className="mt-2 h-9 w-full rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                  disabled={loadingMoreNotifications}
                  onClick={loadMoreNotifications}
                >
                  {loadingMoreNotifications ? (
                    <span className="inline-flex items-center gap-2">
                      <InlineSpinner />
                      <span>Loading</span>
                    </span>
                  ) : "Load more activity"}
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
