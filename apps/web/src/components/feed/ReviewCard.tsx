import { useEffect, useMemo, useRef, useState } from "react";
import { Ellipsis, Flag, Heart, MessageCircle, Repeat2, Trash2 } from "lucide-react";
import type { FeedItem } from "@/lib/api/types";
import fragranceFallbackImg from "@/assets/illustrations/NotFound.png";

const FALLBACK_FRAGRANCE_IMG = fragranceFallbackImg;
const DEFAULT_AVATAR_IMG = "/stacta.png";
const TEAL = "#3EB489";

function safeMap(raw: string | null): Array<{ label: string; value: number }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 1 || n > 5) return null;
        return {
          label: key
            .split("_")
            .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
            .join(" "),
          value: n,
        };
      })
      .filter(Boolean) as Array<{ label: string; value: number }>;
  } catch {
    return [];
  }
}

function ratingValue(value: number | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, n));
}

function HalfStars({ value }: { value: number }) {
  const safe = ratingValue(value);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, safe - i));
        return (
          <span key={i} className="relative inline-block text-xs leading-none text-white/25">
            ★
            <span className="absolute inset-y-0 left-0 overflow-hidden text-amber-200" style={{ width: `${Math.round(fill * 100)}%` }}>
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

function priceTagFromScore(value: number) {
  if (value <= 1) return "Very overpriced";
  if (value === 2) return "A bit overpriced";
  if (value === 3) return "Fair";
  if (value === 4) return "Good value";
  return "Excellent value";
}

function priceToneClasses(value: number) {
  if (value <= 1) return "border-red-400/65 bg-red-500/22 text-red-100";
  if (value === 2) return "border-orange-300/65 bg-orange-400/20 text-orange-100";
  if (value === 3) return "border-white/45 bg-white/20 text-white";
  if (value === 4) return "border-emerald-300/65 bg-emerald-400/20 text-emerald-100";
  return "border-green-300/70 bg-green-400/22 text-green-100";
}

function performanceValueLabel(label: string, value: number) {
  const key = label.trim().toLowerCase();
  if (key === "longevity") {
    const map = ["", "Fleeting", "Weak", "Moderate", "Long lasting", "Endless"];
    return map[value] ?? `${value}/5`;
  }
  if (key === "sillage") {
    const map = ["", "Skin scent", "Weak", "Moderate", "Strong", "Nuclear"];
    return map[value] ?? `${value}/5`;
  }
  return `${value}/5`;
}

export default function ReviewCard({
  item,
  timeAgo,
  onOpenUser,
  onOpenFragrance,
  onDelete,
  onReport,
  onOpenComments,
  deleting,
  onToggleLike,
  liking,
  onToggleRepost,
  reposting,
  onOpenRepostActor,
}: {
  item: FeedItem;
  timeAgo: string;
  onOpenUser: () => void;
  onOpenFragrance: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onOpenComments?: () => void;
  deleting?: boolean;
  onToggleLike?: () => void;
  liking?: boolean;
  onToggleRepost?: () => void;
  reposting?: boolean;
  onOpenRepostActor?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const performance = useMemo(() => safeMap(item.reviewPerformance), [item.reviewPerformance]);
  const pricePerformance = useMemo(
    () => performance.find((row) => row.label.toLowerCase() === "price perception") ?? null,
    [performance]
  );
  const performanceRows = useMemo(
    () => performance.filter((row) => row.label.toLowerCase() !== "price perception"),
    [performance]
  );
  const season = useMemo(() => safeMap(item.reviewSeason), [item.reviewSeason]);
  const occasion = useMemo(() => safeMap(item.reviewOccasion), [item.reviewOccasion]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const node = menuRef.current;
      if (!node) return;
      const target = event.target as Node | null;
      if (target && !node.contains(target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <article
      className="rounded-3xl border border-white/15 p-4 text-white"
      style={{ background: "linear-gradient(180deg, rgba(18,18,18,0.92), rgba(18,18,18,0.78))", backdropFilter: "blur(14px)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <button className="flex min-w-0 items-center gap-2 text-left" onClick={onOpenUser}>
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
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{item.actorDisplayName || item.actorUsername}</div>
            <div className="truncate text-xs text-white/60">@{item.actorUsername}</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {item.type === "REVIEW_REPOSTED" ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100 transition hover:bg-emerald-400/22 disabled:cursor-default"
              onClick={onOpenRepostActor}
              disabled={!onOpenRepostActor}
            >
              <Repeat2 className="h-3 w-3" />
              {((item.repostActorDisplayName || item.repostActorUsername || "Someone") + " reposted")}
            </button>
          ) : (
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85">
              Review
            </span>
          )}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              title="More actions"
              aria-label="More actions"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center px-1 py-0.5 text-white/70 transition hover:text-white"
            >
              <Ellipsis className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-2 min-w-[160px] rounded-xl border border-white/15 bg-[#101114]/95 p-1.5 shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur">
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    disabled={Boolean(deleting)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{deleting ? "Deleting..." : "Delete review"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onReport?.();
                    }}
                    disabled={!onReport}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    <span>Report review</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <button type="button" onClick={onOpenFragrance} className="shrink-0">
          <img
            src={item.fragranceImageUrl?.trim() ? item.fragranceImageUrl : FALLBACK_FRAGRANCE_IMG}
            alt={item.fragranceName || "Fragrance"}
            className="h-14 w-14 rounded-xl border border-white/15 object-cover bg-white/5"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallbackApplied === "1") return;
              img.dataset.fallbackApplied = "1";
              img.src = FALLBACK_FRAGRANCE_IMG;
            }}
          />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onOpenFragrance} className="text-left">
            <div className="truncate text-sm font-semibold text-white">{item.fragranceName || "Fragrance"}</div>
          </button>
          <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: TEAL }}>
            <HalfStars value={Number(item.reviewRating ?? 0)} />
            {item.reviewRating ? <span>{`${Number(item.reviewRating).toFixed(1)}/5`}</span> : null}
          </div>
          {pricePerformance ? (
            <div className="mt-1">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priceToneClasses(pricePerformance.value)}`}>
                {priceTagFromScore(pricePerformance.value)}
              </span>
            </div>
          ) : null}
          {item.reviewExcerpt ? (
            <p className="mt-2 line-clamp-2 text-sm text-white/75">{item.reviewExcerpt}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-white/55">
        <div className="flex items-center gap-3">
          <span>{timeAgo}</span>
          <button
            type="button"
            className="px-0 py-0 text-[10px] font-medium uppercase tracking-[0.1em] text-white/72 underline decoration-white/25 underline-offset-2 transition hover:text-white"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide Details" : "View Details"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Like"
            aria-label="Like review"
            className="inline-flex h-7 items-center justify-center gap-1 text-white/65 transition hover:text-[#3EB489]"
            onClick={onToggleLike}
            disabled={Boolean(liking) || !onToggleLike}
          >
            <Heart className={`h-4 w-4 ${item.viewerHasLiked ? "fill-[#3EB489] text-[#3EB489]" : ""}`} />
            <span className="text-[11px] text-white/70">{item.likesCount}</span>
          </button>
          <button
            type="button"
            title="Comment"
            aria-label="Comment on review"
            className="inline-flex h-7 items-center justify-center gap-1 text-white/65 transition hover:text-[#3EB489] disabled:cursor-not-allowed disabled:opacity-55"
            onClick={onOpenComments}
            disabled={!onOpenComments}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-[11px] text-white/70">{item.commentsCount}</span>
          </button>
          <button
            type="button"
            title="Repost"
            aria-label="Repost review"
            className="inline-flex h-7 items-center justify-center gap-1 text-white/65 transition hover:text-[#3EB489] disabled:cursor-not-allowed disabled:opacity-55"
            onClick={onToggleRepost}
            disabled={Boolean(reposting) || !onToggleRepost}
          >
            <Repeat2 className={`h-4 w-4 ${item.viewerHasReposted ? "text-[#3EB489]" : ""}`} />
            <span className="text-[11px] text-white/70">{item.repostsCount}</span>
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: expanded ? "2000px" : "0px", opacity: expanded ? 1 : 0 }}
      >
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          {performanceRows.length ? (
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/55">Performance</div>
              <div className="space-y-2">
                {performanceRows.map((row) => (
                  <div key={`p-${row.label}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-white/75">
                      <span>{row.label}</span>
                      <span>{performanceValueLabel(row.label, row.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((row.value / 5) * 100)}%`, background: TEAL }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {pricePerformance ? (
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/55">Price</div>
              <div className="text-xs">
                <span className={`rounded-full border px-2 py-0.5 font-semibold ${priceToneClasses(pricePerformance.value)}`}>
                  {priceTagFromScore(pricePerformance.value)}
                </span>
              </div>
            </div>
          ) : null}

          {season.length ? (
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/55">Season</div>
              <div className="space-y-2">
                {season.map((row) => (
                  <div key={`s-${row.label}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-white/75">
                      <span>{row.label}</span>
                      <HalfStars value={row.value} />
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((row.value / 5) * 100)}%`, background: TEAL }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {occasion.length ? (
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/55">Occasion</div>
              <div className="space-y-2">
                {occasion.map((row) => (
                  <div key={`o-${row.label}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-white/75">
                      <span>{row.label}</span>
                      <HalfStars value={row.value} />
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((row.value / 5) * 100)}%`, background: TEAL }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
