import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import { getUnreadNotificationsCount } from "@/lib/api/notifications";
import { listFeed, type FeedFilter, type FeedTab } from "@/lib/api/feed";
import type { FeedItem } from "@/lib/api/types";

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function eventLabel(item: FeedItem) {
  if (item.type === "REVIEW_POSTED") return "posted a review";
  if (item.type === "COLLECTION_ITEM_ADDED") return "added to collection";
  if (item.type === "WISHLIST_ITEM_ADDED") return "added to wishlist";
  if (item.type === "REVIEW_REPOSTED") return "reposted a review";
  return "followed";
}

function kindPill(type: FeedItem["type"]) {
  if (type === "REVIEW_POSTED") return "Review";
  if (type === "COLLECTION_ITEM_ADDED") return "Collection";
  if (type === "WISHLIST_ITEM_ADDED") return "Wishlist";
  if (type === "REVIEW_REPOSTED") return "Repost";
  return "Follow";
}

export default function HomePage() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<FeedTab>("FOLLOWING");
  const [filter, setFilter] = useState<FeedFilter>("ALL");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUnreadNotificationsCount()
      .then((res) => {
        if (!cancelled) setUnreadCount(Math.max(0, Number(res?.count ?? 0)));
      })
      .catch(() => {
        if (!cancelled) setUnreadCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listFeed({ tab, filter, limit: 20 });
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load feed.");
      setItems([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, [filter, tab]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await listFeed({ tab, filter, limit: 20, cursor });
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e: any) {
      setError(e?.message || "Failed to load more feed items.");
    } finally {
      setLoadingMore(false);
    }
  }

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 99 ? "99+" : String(unreadCount);
  }, [unreadCount]);

  const filterOptions: Array<{ value: FeedFilter; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "REVIEW_POSTED", label: "Reviews" },
    { value: "COLLECTION_ITEM_ADDED", label: "Collection" },
    { value: "WISHLIST_ITEM_ADDED", label: "Wishlist" },
    { value: "USER_FOLLOWED_USER", label: "Follows" },
  ];

  const feedHeading = tab === "FOLLOWING" ? "Following activity" : "Popular activity";
  const feedDescription =
    tab === "FOLLOWING"
      ? "Reviews and social activity from people you follow."
      : "Trending reviews and social activity from the community.";

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-7xl px-4 pb-10">
        <div className="mb-5 rounded-3xl border border-white/15 bg-black/30 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Home feed</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{feedHeading}</h1>
              <p className="mt-1 text-sm text-white/65">{feedDescription}</p>
            </div>
            <Button
              variant="secondary"
              className="relative h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
              onClick={() => navigate("/notifications")}
            >
              Notifications
              {unreadLabel ? (
                <span className="absolute -right-2 -top-2 rounded-full border border-white/25 bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unreadLabel}
                </span>
              ) : null}
            </Button>
          </div>

          <div className="mt-4 space-y-1">
            <div className="no-scrollbar overflow-x-auto" role="tablist" aria-label="Feed scope">
              <div className="flex min-w-max items-center gap-6 border-b border-white/10 px-1">
                {[
                  { id: "FOLLOWING" as const, label: "Following" },
                  { id: "POPULAR" as const, label: "Popular" },
                ].map((homeTab) => (
                  <button
                    key={homeTab.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === homeTab.id}
                    onClick={() => setTab(homeTab.id)}
                    className={[
                      "group relative inline-flex items-center gap-2 py-3 text-sm font-medium transition",
                      tab === homeTab.id ? "text-white" : "text-white/65 hover:text-white",
                    ].join(" ")}
                  >
                    <span className={tab === homeTab.id ? "text-cyan-200" : "text-white/45 group-hover:text-white/75"}>
                      {homeTab.id === "FOLLOWING" ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 14c-2.7 0-5 1.3-5 3v2h10v-2c0-1.7-2.3-3-5-3zM16 12c-2 0-4 1-4 2.5V19h9v-1.5c0-1.5-2.2-2.5-5-2.5z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19h16M6 15h3M11 11h3M16 7h2" />
                        </svg>
                      )}
                    </span>
                    <span>{homeTab.label}</span>
                    <span
                      className={[
                        "absolute -bottom-px left-0 right-0 h-[2px] rounded-full transition-all duration-200",
                        tab === homeTab.id ? "bg-cyan-300/95" : "bg-transparent group-hover:bg-white/30",
                      ].join(" ")}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="no-scrollbar overflow-x-auto" role="tablist" aria-label="Feed event filter">
              <div className="flex min-w-max items-center gap-6 border-b border-white/10 px-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={filter === option.value}
                    onClick={() => setFilter(option.value)}
                    className={[
                      "group relative inline-flex items-center gap-2 py-3 text-sm font-medium transition",
                      filter === option.value ? "text-white" : "text-white/65 hover:text-white",
                    ].join(" ")}
                  >
                    <span>{option.label}</span>
                    <span
                      className={[
                        "absolute -bottom-px left-0 right-0 h-[2px] rounded-full transition-all duration-200",
                        filter === option.value ? "bg-cyan-300/95" : "bg-transparent group-hover:bg-white/30",
                      ].join(" ")}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="px-1 pt-1 text-[11px] text-white/45 sm:hidden">Swipe right to see more tabs.</div>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-3">
            {loading ? (
              <div className="rounded-3xl border border-white/15 bg-black/25 p-6">
                <LoadingSpinner label="Loading feed..." />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-white/15 bg-black/25 p-6 text-sm text-white/70">
                No feed items yet for this view.
              </div>
            ) : (
              items.map((item, idx) => (
                <article
                  key={item.id}
                  className="rounded-3xl border border-white/15 bg-black/25 p-4"
                  style={{ animationDelay: `${Math.min(idx * 28, 260)}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="min-w-0 text-left"
                      onClick={() => navigate(`/u/${item.actorUsername}`, { state: { from: { pathname: "/home" } } })}
                    >
                      <div className="truncate text-sm font-semibold text-white">{item.actorDisplayName || item.actorUsername}</div>
                      <div className="truncate text-xs text-white/60">@{item.actorUsername}</div>
                    </button>
                    <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">
                      {kindPill(item.type)}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-white/85">
                    <span className="font-semibold">{item.actorDisplayName || item.actorUsername}</span> {eventLabel(item)}{" "}
                    {item.type === "USER_FOLLOWED_USER" ? (
                      <button
                        className="font-semibold text-cyan-200 hover:underline"
                        onClick={() => item.targetUsername && navigate(`/u/${item.targetUsername}`, { state: { from: { pathname: "/home" } } })}
                      >
                        {item.targetDisplayName || item.targetUsername || "user"}
                      </button>
                    ) : (
                      <span className="font-semibold text-amber-100">{item.fragranceName || "a fragrance"}</span>
                    )}
                    .
                  </div>

                  {item.reviewExcerpt ? (
                    <p className="mt-2 rounded-2xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white/75">{item.reviewExcerpt}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/55">
                    <div>{timeAgo(item.createdAt)}</div>
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg border border-white/15 bg-white/8 px-2 py-1 text-white/75 hover:bg-white/14">Like {item.likesCount}</button>
                      <button className="rounded-lg border border-white/15 bg-white/8 px-2 py-1 text-white/75 hover:bg-white/14">Comment {item.commentsCount}</button>
                      <button className="rounded-lg border border-white/15 bg-white/8 px-2 py-1 text-white/75 hover:bg-white/14">Repost {item.repostsCount}</button>
                    </div>
                  </div>
                </article>
              ))
            )}

            {cursor ? (
              <Button
                variant="secondary"
                className="h-10 w-full rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <InlineSpinner />
                    <span>Loading</span>
                  </span>
                ) : "Load more"}
              </Button>
            ) : null}
          </section>

          <aside className="space-y-3">
            <div className="rounded-3xl border border-white/15 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-white/55">Feed focus</div>
              <div className="mt-2 space-y-2 text-sm text-white/75">
                <div>Prioritize reviews and adds to collection/wishlist.</div>
                <div>Collapse repetitive low-signal events.</div>
                <div>Keep follows lower in ranking than content posts.</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-white/55">Quick actions</div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button
                  variant="secondary"
                  className="h-9 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                  onClick={() => navigate("/search")}
                >
                  Find fragrance
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                  onClick={() => navigate("/users")}
                >
                  Find people
                </Button>
                <Button
                  variant="secondary"
                  className="h-9 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                  onClick={() => navigate("/profile")}
                >
                  My profile
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
