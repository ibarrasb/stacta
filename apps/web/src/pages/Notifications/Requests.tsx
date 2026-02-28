import { useCallback, useEffect, useState } from "react";
import { Home, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import { acceptFollowRequest, declineFollowRequest, listPendingFollowRequests } from "@/lib/api/follows";
import { getMe } from "@/lib/api/me";
import type { PendingFollowRequestItem } from "@/lib/api/types";

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

export default function NotificationRequestsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [pending, setPending] = useState<PendingFollowRequestItem[]>([]);
  const [pendingCursor, setPendingCursor] = useState<string | null>(null);
  const [loadingMorePending, setLoadingMorePending] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingType, setActingType] = useState<"accept" | "decline" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await getMe();
      setIsPrivateAccount(Boolean(me.isPrivate));
      if (!me.isPrivate) {
        setPending([]);
        setPendingCursor(null);
        return;
      }
      const pendingPage = await listPendingFollowRequests({ limit: 20 });
      setPending(pendingPage.items);
      setPendingCursor(pendingPage.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load follow requests.");
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

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <header className="mb-4 rounded-3xl border border-cyan-200/15 bg-[linear-gradient(135deg,rgba(62,180,137,0.16),rgba(18,20,24,0.82)_45%,rgba(10,12,16,0.9))] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Follow Requests</h1>
              <p className="mt-1 text-sm text-cyan-50/75">Approve or decline private-account follow requests.</p>
            </div>
            <Button
              variant="secondary"
              className="h-9 rounded-lg border border-white/20 bg-white/12 px-3 text-white hover:bg-white/18"
              onClick={() => navigate("/notifications")}
            >
              <Home className="mr-1.5 h-4 w-4" />
              Activity
            </Button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(8,10,14,0.5))] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.12em] text-white/45">Requests</p>
            {isPrivateAccount ? (
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/70">
                {pending.length} pending
              </span>
            ) : null}
          </div>
          {loading ? (
            <div className="rounded-xl border border-white/8 bg-black/20 p-6">
              <LoadingSpinner label="Loading requests..." />
            </div>
          ) : !isPrivateAccount ? (
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-white/60">
              Your profile is public, so follow requests are not used.
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-sm text-white/60">
              You have no pending follow requests.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="group flex items-start gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-3 py-3 transition hover:border-cyan-200/30 hover:bg-[linear-gradient(135deg,rgba(62,180,137,0.16),rgba(255,255,255,0.03))]"
                >
                  <button
                    type="button"
                    className="mt-0.5 shrink-0"
                    onClick={() => navigate(`/u/${req.username}`, { state: { from: { pathname: "/notifications/requests" } } })}
                  >
                    <img
                      src={req.avatarUrl?.trim() ? req.avatarUrl : DEFAULT_AVATAR_IMG}
                      alt={`${req.username} avatar`}
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
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => navigate(`/u/${req.username}`, { state: { from: { pathname: "/notifications/requests" } } })}
                  >
                    <div className="text-sm leading-5 text-white/88">
                      <span className="font-semibold text-white">{req.displayName || req.username}</span>{" "}
                      requested to follow you.
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-white/55">
                      <span className="inline-flex h-6 w-6 items-center justify-center text-white/75">
                        <UserPlus className="h-4 w-4" />
                      </span>
                      <span title={when(req.requestedAt)}>{relativeTime(req.requestedAt)}</span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="secondary"
                      className="h-8 rounded-lg border border-white/15 bg-white/8 px-3 text-xs text-white hover:bg-white/14"
                      disabled={actingId === req.id}
                      onClick={() => onDecline(req.id)}
                    >
                      {actingId === req.id && actingType === "decline" ? (
                        <span className="inline-flex items-center gap-2">
                          <InlineSpinner />
                          <span>Declining</span>
                        </span>
                      ) : "Decline"}
                    </Button>
                    <Button className="h-8 rounded-lg bg-white px-3 text-xs text-black hover:bg-white/90" disabled={actingId === req.id} onClick={() => onAccept(req.id)}>
                      {actingId === req.id && actingType === "accept" ? (
                        <span className="inline-flex items-center gap-2">
                          <InlineSpinner />
                          <span>Accepting</span>
                        </span>
                      ) : "Accept"}
                    </Button>
                  </div>
                </div>
              ))}
              {pendingCursor ? (
                <Button
                  variant="secondary"
                  className="mt-2 h-8 w-full rounded-lg border border-white/15 bg-white/8 text-sm text-white hover:bg-white/14"
                  disabled={loadingMorePending}
                  onClick={loadMorePending}
                >
                  {loadingMorePending ? (
                    <span className="inline-flex items-center gap-2">
                      <InlineSpinner />
                      <span>Loading</span>
                    </span>
                  ) : "Load more requests"}
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
