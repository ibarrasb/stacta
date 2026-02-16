// apps/web/src/pages/Fragrances/FragranceDetail.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import NoticeDialog from "@/components/ui/notice-dialog";
import type { FragranceSearchResult } from "@/lib/api/fragrances";
import { getFragranceDetail } from "@/lib/api/fragrances";

import fragrancePlaceholder from "@/assets/illustrations/fragrance-placeholder-4x3.png";
import defaultNoteImg from "@/assets/notes/download.svg";

const DEFAULT_NOTE_IMG = defaultNoteImg;
const FALLBACK_FRAGRANCE_IMG = fragrancePlaceholder;


type Note = { name: string; imageUrl: string | null };
type RankingItem = { name: string; score: number };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeLabel(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ");
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pct(n01: number) {
  return `${Math.round(clamp01(n01) * 100)}%`;
}

function labelToPercent(label: any, kind: "longevity" | "sillage" | "confidence" | "popularity") {
  const v = normalizeLabel(label);

  if (kind === "longevity") {
    const map: Record<string, number> = {
      "very weak": 0.15,
      weak: 0.25,
      short: 0.28,
      "short lasting": 0.28,
      moderate: 0.5,
      medium: 0.5,
      average: 0.5,
      long: 0.75,
      "long lasting": 0.78,
      "very long": 0.9,
      "very long lasting": 0.92,
      beast: 0.95,
      "beast mode": 0.98,
    };
    return map[v] ?? 0;
  }

  if (kind === "sillage") {
    const map: Record<string, number> = {
      intimate: 0.22,
      soft: 0.28,
      close: 0.28,
      moderate: 0.5,
      medium: 0.5,
      strong: 0.78,
      heavy: 0.85,
      "very strong": 0.92,
      enormous: 0.95,
      "room filling": 0.95,
    };
    return map[v] ?? 0;
  }

  const map: Record<string, number> = {
    low: 0.25,
    medium: 0.55,
    moderate: 0.55,
    high: 0.78,
    "very high": 0.92,
    "extremely high": 0.97,
  };
  return map[v] ?? 0;
}

function normalizeNotes(input: any): { top: Note[]; middle: Note[]; base: Note[] } {
  const toList = (arr: any): Note[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((n: any) => ({
        name: typeof n?.name === "string" ? n.name.trim() : "",
        imageUrl: typeof n?.imageUrl === "string" ? n.imageUrl : null,
      }))
      .filter((n: Note) => n.name.length > 0);
  };

  return {
    top: toList(input?.top ?? input?.Top),
    middle: toList(input?.middle ?? input?.Middle),
    base: toList(input?.base ?? input?.Base),
  };
}

const BAR_GRADIENTS = [
  "from-cyan-400 via-fuchsia-400 to-amber-400",
  "from-emerald-400 via-cyan-400 to-violet-400",
  "from-amber-400 via-rose-400 to-violet-400",
  "from-sky-400 via-violet-400 to-amber-400",
];

function hashIdx(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

function Bar({
  label,
  value01,
  rightText,
  gradientClass,
}: {
  label: string;
  value01: number;
  rightText?: string;
  gradientClass?: string;
}) {
  const w = pct(value01);
  const g = gradientClass ?? BAR_GRADIENTS[0];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/70">{label}</div>
        {rightText ? <div className="text-xs font-medium text-white/85">{rightText}</div> : null}
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        <div className={cx("h-full rounded-full bg-gradient-to-r", g)} style={{ width: w }} />
      </div>
    </div>
  );
}

function Stars({ value01 }: { value01: number }) {
  const stars = Math.max(0, Math.min(5, Math.round(clamp01(value01) * 5)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={cx("text-sm", i < stars ? "text-white" : "text-white/25")}>
          ★
        </span>
      ))}
    </div>
  );
}

function VibeChip({ text }: { text: string }) {
  const idx = hashIdx(text.toLowerCase(), BAR_GRADIENTS.length);
  const dotG = BAR_GRADIENTS[idx];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-white/85 shadow-[0_1px_0_rgba(255,255,255,0.05)]">
      <span className={cx("h-2 w-2 rounded-full bg-gradient-to-r", dotG)} />
      <span className="capitalize">{text}</span>
    </span>
  );
}

function NoteTile({ note }: { note: Note }) {
  const [src, setSrc] = useState(note.imageUrl || DEFAULT_NOTE_IMG);

  useEffect(() => {
    setSrc(note.imageUrl || DEFAULT_NOTE_IMG);
  }, [note.imageUrl]);

  return (
    <div className="group flex w-[104px] flex-col items-center gap-2">
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <img
          src={src}
          alt={note.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
          onError={() => {
            if (src !== DEFAULT_NOTE_IMG) setSrc(DEFAULT_NOTE_IMG);
          }}
        />
      </div>
      <div className="w-full truncate text-center text-xs text-white/85">{note.name}</div>
    </div>
  );
}

function PyramidRow({ title, notes }: { title: string; notes: Note[] }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium tracking-wide text-white/60">{title.toUpperCase()}</div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {notes.length || 0}
        </span>
      </div>

      {notes.length ? (
        <div className="flex flex-wrap justify-center gap-4">
          {notes.map((n, i) => (
            <NoteTile key={`${n.name}-${i}`} note={n} />
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/50">—</div>
      )}
    </div>
  );
}

function RankingCard({ title, items }: { title: string; items: RankingItem[] }) {
  const clean = (items ?? []).filter((x) => x && typeof x.name === "string" && Number.isFinite(x.score));
  const sorted = clean.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const max = Math.max(1, ...sorted.map((x) => x.score || 0));

  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-white/80">{title}</div>
          <div className="mt-1 text-[11px] text-white/45">model score (compare within this fragrance)</div>
        </div>
        <div className="text-[10px] text-white/45">ranking</div>
      </div>

      <div className="mt-4 space-y-3">
        {sorted.length ? (
          sorted.map((it) => {
            const v01 = clamp01((it.score || 0) / max);
            const grad = BAR_GRADIENTS[hashIdx(`${title}:${it.name}`, BAR_GRADIENTS.length)];
            return (
              <div key={`${it.name}-${it.score}`} className="grid grid-cols-[90px_1fr_130px] items-center gap-3">
                <div className="text-xs text-white/80 capitalize">{it.name}</div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                  <div className={cx("h-full rounded-full bg-gradient-to-r", grad)} style={{ width: pct(v01) }} />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <div className="text-[11px] tabular-nums text-white/65">{it.score.toFixed(2)}</div>
                  <Stars value01={v01} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-white/50">—</div>
        )}
      </div>

      <div className="mt-4 text-xs text-white/45">
        These are algorithmic suitability scores (notes + accords). Use them to compare options within this fragrance—not as
        an absolute 0–5 scale, and not as a global comparison across different fragrances.
      </div>
    </div>
  );
}

function safeDecodeURIComponent(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default function FragranceDetailPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { externalId } = useParams();

  const routeExternalId = externalId ? safeDecodeURIComponent(externalId) : null;

  const [loaded, setLoaded] = useState<FragranceSearchResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [retryTick, setRetryTick] = useState(0);
  const forceRefreshRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);

  const stateFragrance = (location?.state?.fragrance ?? null) as (FragranceSearchResult & any) | null;
  const fragrance = (stateFragrance ?? loaded) as (FragranceSearchResult & any) | null;

  const from = location?.state?.from as { pathname?: string; search?: string } | undefined;

  function inferPreferredSource(id: string): "FRAGELLA" | "COMMUNITY" | null {
    const s = id.toLowerCase();
    if (s.startsWith("community_") || s.startsWith("comm_") || s.startsWith("c_")) return "COMMUNITY";
    return "FRAGELLA";
  }

  useEffect(() => {
    if (stateFragrance) return;
    if (!routeExternalId) return;

    const ctrl = new AbortController();

    setLoadError(null);
    setIsLoading(true);

    const preferred = inferPreferredSource(routeExternalId);

    const bypassCache = forceRefreshRef.current;
    forceRefreshRef.current = false;

    (async () => {
      try {
        const first = await getFragranceDetail(
          { source: preferred ?? "FRAGELLA", externalId: routeExternalId },
          { signal: ctrl.signal, bypassCache }
        );
        setLoaded(first);
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }

      if (preferred !== "COMMUNITY") {
        try {
          const second = await getFragranceDetail(
            { source: "COMMUNITY", externalId: routeExternalId },
            { signal: ctrl.signal, bypassCache }
          );
          setLoaded(second);
          return;
        } catch (e: any) {
          if (e?.name === "AbortError") return;
        }
      }

      setLoadError("Could not load fragrance details. Open it from Search, or try again.");
    })()
      .catch((e: any) => {
        if (e?.name === "AbortError") return;
        setLoadError("Could not load fragrance details. Open it from Search, or try again.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoading(false);
      });

    return () => {
      ctrl.abort();
    };
  }, [routeExternalId, stateFragrance, retryTick]);

  const accords = useMemo(() => {
    const a = fragrance?.mainAccords ?? [];
    return Array.isArray(a) ? a.filter(Boolean) : [];
  }, [fragrance]);

  const generalNotes = useMemo(() => {
    const n = fragrance?.generalNotes ?? [];
    return Array.isArray(n) ? n.filter(Boolean) : [];
  }, [fragrance]);

  const accordsPercent = useMemo(() => {
    const raw = fragrance?.mainAccordsPercentage ?? (fragrance as any)?.mainAccordsPercent ?? null;
    if (!raw || typeof raw !== "object") return null as null | Record<string, any>;
    return raw as Record<string, any>;
  }, [fragrance]);

  const noteGroups = useMemo(() => normalizeNotes(fragrance?.notes), [fragrance]);
  const hasStageNotes = noteGroups.top.length > 0 || noteGroups.middle.length > 0 || noteGroups.base.length > 0;

  const oilType = fragrance?.oilType ?? (fragrance as any)?.OilType ?? null;
  const longevityLabel = fragrance?.longevity ?? (fragrance as any)?.Longevity ?? null;
  const sillageLabel = fragrance?.sillage ?? (fragrance as any)?.Sillage ?? null;
  const confidenceLabel = fragrance?.confidence ?? (fragrance as any)?.Confidence ?? null;
  const popularityLabel = fragrance?.popularity ?? (fragrance as any)?.Popularity ?? null;

  const longevity01 = labelToPercent(longevityLabel, "longevity");
  const sillage01 = labelToPercent(sillageLabel, "sillage");
  const confidence01 = labelToPercent(confidenceLabel, "confidence");
  const popularity01 = labelToPercent(popularityLabel, "popularity");

  const seasonRanking: RankingItem[] = useMemo(() => {
    const r = fragrance?.seasonRanking ?? (fragrance as any)?.["Season Ranking"] ?? [];
    if (!Array.isArray(r)) return [];
    return r
      .map((x: any) => ({ name: String(x?.name ?? "").trim(), score: Number(x?.score) }))
      .filter((x: any) => x.name && Number.isFinite(x.score));
  }, [fragrance]);

  const occasionRanking: RankingItem[] = useMemo(() => {
    const r = fragrance?.occasionRanking ?? (fragrance as any)?.["Occasion Ranking"] ?? [];
    if (!Array.isArray(r)) return [];
    return r
      .map((x: any) => ({ name: String(x?.name ?? "").trim(), score: Number(x?.score) }))
      .filter((x: any) => x.name && Number.isFinite(x.score));
  }, [fragrance]);

  const addToCollection = useCallback(async () => {
    setNotice("Add to collection (wire backend endpoint next).");
  }, []);

  const addToWishlist = useCallback(async () => {
    setNotice("Add to wishlist (wire backend endpoint next).");
  }, []);

  const writeReview = useCallback(async () => {
    setNotice("Review flow (wire backend endpoint next).");
  }, []);

  const buyDisabled = !fragrance?.purchaseUrl;

  const accordBars = useMemo(() => {
    if (!accordsPercent) return null;

    const entries = Object.entries(accordsPercent)
      .map(([k, v]) => {
        const key = String(k).trim();
        if (!key) return null;

        if (typeof v === "number" && Number.isFinite(v)) {
          const n = v > 1 ? v / 100 : v;
          return { name: key, value01: clamp01(n), labelRight: `${Math.round(clamp01(n) * 100)}%` };
        }

        const lv = normalizeLabel(v);
        const map: Record<string, number> = { dominant: 0.92, prominent: 0.75, moderate: 0.55, low: 0.3 };
        const n = map[lv] ?? 0;
        return { name: key, value01: n, labelRight: String(v) };
      })
      .filter(Boolean) as Array<{ name: string; value01: number; labelRight: string }>;

    entries.sort((a, b) => b.value01 - a.value01);
    return entries;
  }, [accordsPercent]);

  const headerMeta = useMemo(() => {
    const year = fragrance?.year ? String(fragrance.year) : null;
    const gender = fragrance?.gender ? String(fragrance.gender) : null;
    return { year, gender };
  }, [fragrance?.year, fragrance?.gender]);
  

  const showSkeleton = !stateFragrance && isLoading && !loaded;

  const ratingValue = useMemo(() => {
    const candidates = [
      (fragrance as any)?.rating,
      (fragrance as any)?.ratingValue,
      (fragrance as any)?.rating_score,
      (fragrance as any)?.score,
    ];
    const raw = candidates.find((v) => v !== null && v !== undefined && String(v).trim() !== "");
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [fragrance]);

  const rating01 = ratingValue ? clamp01(ratingValue / 5) : 0;

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/15 bg-black/30 p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Fragrance Intelligence</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Fragrance</h1>
            <p className="mt-1 text-sm text-white/65">Details + add to your collection.</p>
          </div>

          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
            onClick={() => {
              if (from?.pathname) {
                navigate(`${from.pathname}${from.search ?? ""}`);
                return;
              }
              navigate(-1);
            }}
          >
            Back
          </Button>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/6 p-6">
          {showSkeleton ? (
            <div className="rounded-2xl border border-white/15 bg-black/25 p-4">
              <div className="text-sm font-semibold">Loading…</div>
              <div className="mt-2 text-sm text-white/70">Fetching fragrance details.</div>
            </div>
          ) : !fragrance ? (
            <div className="rounded-2xl border border-white/15 bg-black/25 p-4">
              <div className="text-sm font-semibold">{loadError ? "Couldn’t load" : "Open from Search"}</div>
              <div className="mt-2 text-sm text-white/70">
                {loadError
                  ? loadError
                  : "There’s no cached state for this route yet. Open this page by clicking a fragrance from Search."}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="h-10 rounded-xl px-5" onClick={() => navigate("/search")}>
                  Go to Search
                </Button>

                {routeExternalId ? (
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                    onClick={() => {
                      forceRefreshRef.current = true;
                      setRetryTick((x) => x + 1);
                    }}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
              <div className="overflow-hidden rounded-3xl border border-white/15 bg-black/25 lg:sticky lg:top-24">
                <div className="p-4">
                  <div className="mb-4 lg:hidden">
                    <div className="text-xs text-white/60">{fragrance.brand || "—"}</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">{fragrance.name || "—"}</div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {oilType ? (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/85">
                          {oilType}
                        </span>
                      ) : null}

                        <div className="text-sm text-white/60">
                          {headerMeta.year || headerMeta.gender ? (
                            <span className="inline-flex items-center gap-2">
                              {headerMeta.year ? (
                                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-white font-semibold tabular-nums">
                                  {headerMeta.year}
                                </span>
                              ) : null}
                              {headerMeta.gender ? <span>{headerMeta.gender}</span> : null}
                            </span>
                          ) : (
                            "—"
                          )}
                        </div>

                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/20">
                      <img
                        src={fragrance.imageUrl?.trim() ? fragrance.imageUrl : FALLBACK_FRAGRANCE_IMG}
                        alt={`${fragrance.brand} ${fragrance.name}`.trim()}
                        className="w-full bg-white/5 object-contain"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.dataset.fallbackApplied === "1") return;
                          img.dataset.fallbackApplied = "1";
                          img.src = FALLBACK_FRAGRANCE_IMG;
                        }}
                      />
                    </div>

                </div>

                <div className="border-t border-white/15 bg-gradient-to-b from-white/8 to-black/10 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button className="h-10 rounded-xl px-5" onClick={addToCollection}>
                      Add to collection
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                      onClick={addToWishlist}
                    >
                      Add to wishlist
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                      onClick={writeReview}
                    >
                      Review
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                      disabled={buyDisabled}
                      onClick={() => {
                        if (fragrance.purchaseUrl) window.open(fragrance.purchaseUrl, "_blank");
                      }}
                    >
                      Buy
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
                      <div className="text-[11px] text-white/60">Rating</div>
                      {ratingValue ? (
                        <div className="mt-2 flex flex-col items-center">
                          <Stars value01={rating01} />
                          <div className="mt-1 text-[12px] font-semibold tabular-nums text-white/85">
                            {ratingValue.toFixed(2)}/5
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-sm font-semibold">—</div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
                      <div className="text-[11px] text-white/60">Price</div>
                      <div className="mt-1 text-sm font-semibold">{fragrance.priceValue ?? fragrance.price ?? "—"}</div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/15 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-white/80">Performance</div>
                        <div className="mt-1 text-[11px] text-white/45">longevity • sillage • signals</div>
                      </div>
                      <div className="text-[10px] text-white/45">from provider</div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <Bar
                        label="Longevity"
                        value01={longevity01}
                        rightText={longevityLabel ? String(longevityLabel) : "—"}
                        gradientClass={BAR_GRADIENTS[0]}
                      />
                      <Bar
                        label="Sillage"
                        value01={sillage01}
                        rightText={sillageLabel ? String(sillageLabel) : "—"}
                        gradientClass={BAR_GRADIENTS[1]}
                      />
                      <Bar
                        label="Confidence"
                        value01={confidence01}
                        rightText={confidenceLabel ? String(confidenceLabel) : "—"}
                        gradientClass={BAR_GRADIENTS[2]}
                      />
                      <Bar
                        label="Popularity"
                        value01={popularity01}
                        rightText={popularityLabel ? String(popularityLabel) : "—"}
                        gradientClass={BAR_GRADIENTS[3]}
                      />
                    </div>

                    <div className="mt-4 text-xs text-white/45">
                      Confidence/Popularity are categorical provider labels (not verified by us).
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="hidden lg:block">
                  <div className="text-xs text-white/60">{fragrance.brand || "—"}</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">{fragrance.name || "—"}</div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {oilType ? (
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/85">
                        {oilType}
                      </span>
                    ) : null}

                      <div className="text-sm text-white/60">
                        {headerMeta.year || headerMeta.gender ? (
                          <span className="inline-flex items-center gap-2">
                            {headerMeta.year ? (
                              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-white font-semibold tabular-nums">
                                {headerMeta.year}
                              </span>
                            ) : null}
                            {headerMeta.gender ? <span>{headerMeta.gender}</span> : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>

                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-white/80">Main accords</div>
                      <div className="mt-1 text-[11px] text-white/45">the vibe, at a glance</div>
                    </div>
                    <div className="text-[10px] text-white/45">mood</div>
                  </div>

                  <div className="mt-4">
                    {accordBars && accordBars.length ? (
                      <div className="space-y-3">
                        {accordBars.slice(0, 8).map((it) => {
                          const grad = BAR_GRADIENTS[hashIdx(it.name, BAR_GRADIENTS.length)];
                          return (
                            <Bar key={it.name} label={it.name} value01={it.value01} rightText={it.labelRight} gradientClass={grad} />
                          );
                        })}

                        <div className="mt-3 text-xs text-white/45">
                          Fragella’s accord strengths are derived from internal percentages, then returned as labels
                          (Dominant/Prominent/Moderate) for readability.
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {accords.length ? accords.map((a, i) => <VibeChip key={`${a}-${i}`} text={a} />) : (
                          <span className="text-xs text-white/50">—</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-white/80">General notes</div>
                    <div className="text-[10px] text-white/45">ingredients</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {generalNotes.length ? generalNotes.map((n, i) => <VibeChip key={`${n}-${i}`} text={n} />) : (
                      <span className="text-xs text-white/50">—</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <RankingCard title="Season ranking" items={seasonRanking} />
                  <RankingCard title="Occasion ranking" items={occasionRanking} />
                </div>

                {hasStageNotes ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold">Perfume pyramid</div>
                      <div className="mt-1 text-xs text-white/55">Top opens • Middle heart • Base lasts</div>
                    </div>

                    <div className="grid gap-4">
                      <PyramidRow title="Top notes" notes={noteGroups.top} />
                      <PyramidRow title="Middle notes" notes={noteGroups.middle} />
                      <PyramidRow title="Base notes" notes={noteGroups.base} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                    <div className="text-xs font-medium text-white/60">Perfume pyramid</div>
                    <div className="mt-2 text-sm text-white/70">This fragrance didn’t include staged notes in the response.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <NoticeDialog
        open={Boolean(notice)}
        title="Coming Soon"
        message={notice ?? ""}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}
