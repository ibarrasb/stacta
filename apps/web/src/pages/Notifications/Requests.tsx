import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import { acceptFollowRequest, declineFollowRequest, listPendingFollowRequests } from "@/lib/api/follows";
import { getMe } from "@/lib/api/me";
import type { PendingFollowRequestItem } from "@/lib/api/types";

function when(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
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
      <div className="mx-auto max-w-5xl px-4 pb-10">
        <div className="mb-5 rounded-3xl border border-white/15 bg-black/30 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Notification center</div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Follow requests</h1>
              <p className="mt-1 text-sm text-white/70">Approve or decline private-account follow requests.</p>
            </div>
            <Button
              variant="secondary"
              className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
              onClick={() => navigate("/notifications")}
            >
              Back to activity
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/15 bg-white/6 p-5">
          {loading ? (
            <div className="rounded-2xl border border-white/12 bg-black/25 p-6">
              <LoadingSpinner label="Loading requests..." />
            </div>
          ) : !isPrivateAccount ? (
            <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white/65">
              Your profile is public, so follow requests are not used.
            </div>
          ) : pending.length === 0 ? (
            <div className="rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm text-white/65">
              You have no pending follow requests.
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/12 bg-black/25 px-3 py-3"
                >
                  <button
                    className="min-w-0 text-left"
                    onClick={() =>
                      navigate(`/u/${req.username}`, {
                        state: { from: { pathname: "/notifications/requests" } },
                      })
                    }
                  >
                    <div className="truncate text-sm font-semibold text-white">{req.displayName || req.username}</div>
                    <div className="truncate text-xs text-white/65">@{req.username}</div>
                    <div className="mt-0.5 text-[11px] text-white/45">Requested {when(req.requestedAt)}</div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-white hover:bg-white/18"
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
                    <Button className="h-9 rounded-xl bg-white text-black hover:bg-white/90" disabled={actingId === req.id} onClick={() => onAccept(req.id)}>
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
                  className="mt-2 h-9 w-full rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
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
