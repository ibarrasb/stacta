import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCheck, Heart, Home, MessageCircle, Repeat2, ShieldAlert, Trash2, UserPlus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import { listPendingFollowRequests } from "@/lib/api/follows";
import { getMe } from "@/lib/api/me";
import { clearReadNotifications, deleteNotification, listNotifications } from "@/lib/api/notifications";
import type { NotificationItem, PendingFollowRequestItem } from "@/lib/api/types";

const DEFAULT_AVATAR_IMG = "/stacta.png";

function when(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function relativeTime(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}w`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo`;
  const year = Math.floor(day / 365);
  return `${year}y`;
}

function messageFor(item: NotificationItem) {
  if (item.type === "MODERATION_STRIKE") {
    return "issued you a moderation strike.";
  }
  if (item.type === "REVIEW_COMMENTED") {
    return `commented on your review${item.reviewFragranceName ? ` on ${item.reviewFragranceName}` : ""}.`;
  }
  if (item.type === "REVIEW_COMMENT_REPLIED") {
    return `replied to your comment${item.reviewFragranceName ? ` on ${item.reviewFragranceName}` : ""}.`;
  }
  if (item.type === "REVIEW_LIKED") {
    const count = Math.max(1, item.aggregateCount ?? 1);
    if (count <= 1) {
      return `liked your review${item.reviewFragranceName ? ` on ${item.reviewFragranceName}` : ""}.`;
    }
    return `and ${count - 1} other${count - 1 === 1 ? "" : "s"} liked your review${item.reviewFragranceName ? ` on ${item.reviewFragranceName}` : ""}.`;
  }
  return item.followedBack ? "followed you back." : "followed you.";
}

function metaFor(item: NotificationItem) {
  if (item.type === "MODERATION_STRIKE") return "Moderation";
  if (item.type === "REVIEW_COMMENTED") return "Comment";
  if (item.type === "REVIEW_COMMENT_REPLIED") return "Reply";
  if (item.type === "REVIEW_LIKED") return "Like";
  return "Follow";
}

function metaIcon(item: NotificationItem) {
  if (item.type === "MODERATION_STRIKE") return <ShieldAlert className="h-4 w-4" />;
  if (item.type === "REVIEW_COMMENTED" || item.type === "REVIEW_COMMENT_REPLIED") return <MessageCircle className="h-4 w-4" />;
  if (item.type === "REVIEW_REPOSTED") return <Repeat2 className="h-4 w-4" />;
  if (item.type === "REVIEW_LIKED") return <Heart className="h-4 w-4" />;
  return <UserPlus className="h-4 w-4" />;
}

function dayBucket(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.floor((startOfToday - startOfDate) / 86400000);
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return "This week";
  return "Earlier";
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

  const headerLabel = useMemo(() => {
    if (items.length <= 0) return "No recent activity";
    return `${items.length} recent notification${items.length === 1 ? "" : "s"}`;
  }, [items.length]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, NotificationItem[]>();
    for (const item of items) {
      const key = dayBucket(item.createdAt);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(item);
    }
    return ["Today", "Yesterday", "This week", "Earlier"]
      .map((label) => ({ label, items: buckets.get(label) ?? [] }))
      .filter((section) => section.items.length > 0);
  }, [items]);

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
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <header className="mb-4 rounded-3xl border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(62,180,137,0.16),rgba(18,20,24,0.82)_45%,rgba(10,12,16,0.9))] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
              <p className="mt-1 text-sm text-cyan-50/75">{headerLabel}</p>
            </div>
            <Button
              variant="secondary"
              className="h-9 rounded-lg border border-white/20 bg-white/12 px-3 text-white hover:bg-white/18"
              onClick={() => navigate("/home")}
            >
              <Home className="mr-1.5 h-4 w-4" />
              Home
            </Button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {isPrivateAccount ? (
          <section className="mb-4 rounded-2xl border border-white/12 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-white/80">
                Follow requests:{" "}
                <span className="font-semibold text-white">
                  {pendingPreview.length === 0 ? "none" : hasMorePending ? "4+" : pendingPreview.length}
                </span>
              </div>
              <Button
                variant="secondary"
                className="h-8 rounded-lg border border-white/15 bg-white/8 px-3 text-xs text-white hover:bg-white/14"
                onClick={() => navigate("/notifications/requests")}
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Open
              </Button>
            </div>
            {pendingPreview.length > 0 ? (
              <p className="mt-2 text-xs text-white/55">
                {pendingPreview.slice(0, 3).map((req) => req.displayName || req.username).join(", ")}
                {pendingPreview.length > 3 || hasMorePending ? ", and more" : ""}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(8,10,14,0.5))] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.12em] text-white/45">Activity</p>
            <button
              type="button"
              title="Clear read"
              aria-label="Clear read notifications"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/8 text-white/80 transition hover:border-cyan-200/35 hover:bg-white/14 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading || items.length === 0 || clearingRead}
              onClick={() => void onClearRead()}
            >
              {clearingRead ? (
                <InlineSpinner className="h-3 w-3" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
            </button>
          </div>

          {loading ? (
            <div className="rounded-xl border border-white/8 bg-black/20 p-6">
              <LoadingSpinner label="Loading activity..." />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-white/60">
              No activity yet.
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((section) => (
                <div key={section.label}>
                  <div className="mb-2 px-1 text-[11px] uppercase tracking-[0.12em] text-white/45">{section.label}</div>
                  <div className="space-y-2.5">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-start gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-3 py-3 transition hover:border-cyan-200/30 hover:bg-[linear-gradient(135deg,rgba(62,180,137,0.16),rgba(255,255,255,0.03))]"
                      >
                        <button
                          type="button"
                          className="mt-0.5 shrink-0"
                          onClick={() => navigate(`/u/${item.actorUsername}`, { state: { from: { pathname: "/notifications" } } })}
                        >
                          <img
                            src={item.actorAvatarUrl?.trim() ? item.actorAvatarUrl : DEFAULT_AVATAR_IMG}
                            alt={`${item.actorUsername} avatar`}
                            className="h-9 w-9 rounded-full border border-white/15 object-cover"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (img.dataset.fallbackApplied === "1") return;
                              img.dataset.fallbackApplied = "1";
                              img.src = DEFAULT_AVATAR_IMG;
                            }}
                          />
                        </button>
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            if (item.type === "MODERATION_STRIKE") return;
                            if (
                              (item.type === "REVIEW_COMMENTED" || item.type === "REVIEW_COMMENT_REPLIED") &&
                              item.sourceReviewId
                            ) {
                              navigate(`/reviews/${encodeURIComponent(item.sourceReviewId)}`, {
                                state: { from: { pathname: "/notifications" } },
                              });
                              return;
                            }
                            navigate(`/u/${item.actorUsername}`, {
                              state: { from: { pathname: "/notifications" } },
                            });
                          }}
                        >
                          <div className="text-sm leading-5 text-white/88">
                            <span className="font-semibold text-white">{item.actorDisplayName || item.actorUsername}</span>{" "}
                            {messageFor(item)}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-white/55">
                            <span
                              title={metaFor(item)}
                              aria-label={metaFor(item)}
                              className="inline-flex h-6 w-6 items-center justify-center text-white/75"
                            >
                              {metaIcon(item)}
                            </span>
                            <span title={when(item.createdAt)}>{relativeTime(item.createdAt)}</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          title="Remove notification"
                          aria-label="Remove notification"
                          className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/20 text-white/55 opacity-0 transition hover:border-red-300/45 hover:bg-red-500/15 hover:text-red-100 group-hover:opacity-100 focus-visible:opacity-100"
                          disabled={deletingNotificationId === item.id}
                          onClick={() => void onDeleteNotification(item.id)}
                        >
                          {deletingNotificationId === item.id ? (
                            <InlineSpinner className="h-3 w-3" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {notificationsCursor ? (
                <Button
                  variant="secondary"
                  className="mt-2 h-8 w-full rounded-lg border border-white/15 bg-white/8 text-sm text-white hover:bg-white/14"
                  disabled={loadingMoreNotifications}
                  onClick={loadMoreNotifications}
                >
                  {loadingMoreNotifications ? (
                    <span className="inline-flex items-center gap-2">
                      <InlineSpinner />
                      <span>Loading</span>
                    </span>
                  ) : "Load more"}
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
