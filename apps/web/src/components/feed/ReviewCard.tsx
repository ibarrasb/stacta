import { useMemo, useState } from "react";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import type { FeedItem } from "@/lib/api/types";
import fragranceFallbackImg from "@/assets/illustrations/NotFound.png";

const FALLBACK_FRAGRANCE_IMG = fragranceFallbackImg;
const TEAL = "#3EB489";

function initials(name?: string | null) {
  const n = (name || "").trim();
  if (!n) return "S";
  const parts = n.split(/\s+/).slice(0, 2);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "S";
}

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

function ratingStars(value: number) {
  const safe = Math.max(0, Math.min(5, Math.round(value)));
  return "★★★★★".slice(0, safe) + "☆☆☆☆☆".slice(0, 5 - safe);
}

export default function ReviewCard({
  item,
  timeAgo,
  onOpenUser,
  onOpenFragrance,
}: {
  item: FeedItem;
  timeAgo: string;
  onOpenUser: () => void;
  onOpenFragrance: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const performance = useMemo(() => safeMap(item.reviewPerformance), [item.reviewPerformance]);
  const season = useMemo(() => safeMap(item.reviewSeason), [item.reviewSeason]);
  const occasion = useMemo(() => safeMap(item.reviewOccasion), [item.reviewOccasion]);

  return (
    <article
      className="rounded-3xl border border-white/15 p-4 text-white"
      style={{ background: "linear-gradient(180deg, rgba(18,18,18,0.92), rgba(18,18,18,0.78))", backdropFilter: "blur(14px)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <button className="flex min-w-0 items-center gap-2 text-left" onClick={onOpenUser}>
          {item.actorAvatarUrl ? (
            <img
              src={item.actorAvatarUrl}
              alt={`${item.actorUsername} avatar`}
              className="h-9 w-9 rounded-full border border-white/15 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white/75">
              {initials(item.actorDisplayName || item.actorUsername)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{item.actorDisplayName || item.actorUsername}</div>
            <div className="truncate text-xs text-white/60">@{item.actorUsername}</div>
          </div>
        </button>
        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85">
          Review
        </span>
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
          <div className="mt-1 text-xs" style={{ color: TEAL }}>
            {ratingStars(Number(item.reviewRating ?? 0))} {item.reviewRating ? `(${item.reviewRating}/5)` : ""}
          </div>
          {item.reviewExcerpt ? (
            <p className="mt-2 line-clamp-2 text-sm text-white/75">{item.reviewExcerpt}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-white/55">
        <span>{timeAgo}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/20 bg-white/8 px-2 py-1 text-white/85 hover:bg-white/14"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide Details" : "View Details"}
          </button>
          <button
            type="button"
            title="Like"
            aria-label="Like review"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/75 transition hover:border-[#3EB489]/60 hover:bg-[#3EB489]/15 hover:text-[#3EB489]"
          >
            <Heart className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Comment"
            aria-label="Comment on review"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/75 transition hover:border-[#3EB489]/60 hover:bg-[#3EB489]/15 hover:text-[#3EB489]"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Repost"
            aria-label="Repost review"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/75 transition hover:border-[#3EB489]/60 hover:bg-[#3EB489]/15 hover:text-[#3EB489]"
          >
            <Repeat2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ maxHeight: expanded ? "560px" : "0px", opacity: expanded ? 1 : 0 }}
      >
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          {performance.length ? (
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/55">Performance</div>
              <div className="space-y-2">
                {performance.map((row) => (
                  <div key={`p-${row.label}`}>
                    <div className="mb-1 flex items-center justify-between text-xs text-white/75">
                      <span>{row.label}</span>
                      <span>{row.value}/5</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.round((row.value / 5) * 100)}%`, background: TEAL }} />
                    </div>
                  </div>
                ))}
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
                      <span>{ratingStars(row.value)}</span>
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
                      <span>{ratingStars(row.value)}</span>
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
