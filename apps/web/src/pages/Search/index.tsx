// apps/web/src/pages/Search/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchFragrances, searchCommunityFragrances, type FragranceSearchResult } from "@/lib/api/fragrances";
import fragrancePlaceholder from "@/assets/illustrations/NotFound.png";

const FALLBACK_IMG = fragrancePlaceholder;


function pickExternalId(item: any): string | null {
  const candidates = [item?.externalId, item?.external_id, item?.id, item?.slug, item?.uuid];
  for (const c of candidates) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) return s;
  }
  return null;
}

function normalize(item: any): FragranceSearchResult {
  return {
    source: item?.source ?? "fragella",
    externalId: pickExternalId(item),

    name: item?.name ?? "",
    brand: item?.brand ?? "",
    year: item?.year ?? null,
    imageUrl: item?.imageUrl ?? null,
    gender: item?.gender ?? null,

    rating: item?.rating ?? null,
    price: item?.price ?? null,
    priceValue: item?.priceValue ?? null,
    purchaseUrl: item?.purchaseUrl ?? null,

    oilType: item?.oilType ?? null,
    longevity: item?.longevity ?? null,
    sillage: item?.sillage ?? null,
    confidence: item?.confidence ?? null,
    popularity: item?.popularity ?? null,

    mainAccords: Array.isArray(item?.mainAccords) ? item.mainAccords : [],
    generalNotes: Array.isArray(item?.generalNotes) ? item.generalNotes : [],

    mainAccordsPercentage: item?.mainAccordsPercentage ?? null,

    seasonRanking: Array.isArray(item?.seasonRanking) ? item.seasonRanking : [],
    occasionRanking: Array.isArray(item?.occasionRanking) ? item.occasionRanking : [],

    notes: item?.notes ?? null,

    // community-only (safe to be missing for fragella)
    concentration: item?.concentration ?? null,
    longevityScore: item?.longevityScore ?? null,
    sillageScore: item?.sillageScore ?? null,
    visibility: item?.visibility ?? null,
    createdByUserId: item?.createdByUserId ?? null,
    createdByUsername: item?.createdByUsername ?? null,
    ratingCount: item?.ratingCount ?? null,
    userRating: item?.userRating ?? null,
  };
}

function makeRouteId(item: FragranceSearchResult, idx: number) {
  const ext = item.externalId?.trim();
  if (ext) return ext;

  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? (crypto as any).randomUUID()
      : `r${Date.now()}_${Math.random().toString(16).slice(2)}`;

  return `f_${rand}_${idx}`;
}

function cacheKey(q: string) {
  return `stacta:search:${encodeURIComponent(q)}`;
}

function normalizeSearchText(v: string) {
  return v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(v: string) {
  const n = normalizeSearchText(v);
  return n ? n.split(" ").filter(Boolean) : [];
}

function scoreSearchHit(item: FragranceSearchResult, rawQuery: string) {
  const q = normalizeSearchText(rawQuery);
  if (!q) return 0;

  const name = normalizeSearchText(item.name ?? "");
  const brand = normalizeSearchText(item.brand ?? "");
  const combined = normalizeSearchText(`${brand} ${name}`);
  const nameTokens = tokenize(name);
  const combinedTokens = tokenize(combined);
  const qTokens = tokenize(q);

  let score = 0;

  if (name === q) score += 10000;
  if (combined === q) score += 9000;
  if (`${name} ${brand}`.trim() === q) score += 8500;

  if (name.startsWith(q)) score += 7000;
  if (combined.startsWith(q)) score += 5500;
  if (name.includes(q)) score += 4200;
  if (combined.includes(q)) score += 3000;

  if (qTokens.length && qTokens.every((t) => nameTokens.includes(t))) score += 2000;
  if (qTokens.length && qTokens.every((t) => combinedTokens.includes(t))) score += 1400;

  if (qTokens.length >= 2) {
    const allInOrderInName = qTokens.join(" ") === name;
    const allInOrderInCombined = qTokens.join(" ") === combined;
    if (allInOrderInName) score += 1500;
    if (allInOrderInCombined) score += 900;
  }

  score -= Math.abs(name.length - q.length);
  return score;
}

function rankSearchResults(items: FragranceSearchResult[], rawQuery: string) {
  return items
    .slice()
    .sort((a, b) => {
      const diff = scoreSearchHit(b, rawQuery) - scoreSearchHit(a, rawQuery);
      if (diff !== 0) return diff;

      const aName = (a.name ?? "").length;
      const bName = (b.name ?? "").length;
      return aName - bName;
    });
}

function isExactResult(item: FragranceSearchResult, rawQuery: string) {
  const q = normalizeSearchText(rawQuery);
  if (!q) return false;

  const name = normalizeSearchText(item.name ?? "");
  const brand = normalizeSearchText(item.brand ?? "");
  const combined = normalizeSearchText(`${brand} ${name}`);
  const reversed = normalizeSearchText(`${name} ${brand}`);
  const nameWithoutBrandPrefix =
    brand && name.startsWith(`${brand} `) ? name.slice(brand.length + 1).trim() : name;

  return (
    name === q ||
    combined === q ||
    reversed === q ||
    nameWithoutBrandPrefix === q
  );
}

type CachedSearch = {
  query: string;
  results: FragranceSearchResult[];
  visibleCount: number;
  scrollY: number;
  savedAt: number;
};

function clampVisible(v: number) {
  if (!Number.isFinite(v)) return 10;
  return Math.min(50, Math.max(10, v));
}

// Memoized card: reduces rerender cost when typing / toggling dialogs / etc.
const ResultCard = React.memo(function ResultCard({
  item,
  idx,
  exactMatch,
  onOpen,
}: {
  item: FragranceSearchResult;
  idx: number;
  exactMatch: boolean;
  onOpen: (item: FragranceSearchResult, idx: number) => void;
}) {
  // ✅ put it HERE (normal JS, before return)
  const src = item.imageUrl?.trim() ? item.imageUrl : FALLBACK_IMG;

  return (
    <button
      className="group overflow-hidden rounded-3xl border border-white/15 bg-black/25 text-left transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
      onClick={() => onOpen(item, idx)}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-black/20">
        <img
          src={src}
          alt={`${item.brand} ${item.name}`.trim()}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            const img = e.currentTarget;

            // prevent infinite loop if fallback also fails
            if (img.dataset.fallbackApplied === "1") return;

            img.dataset.fallbackApplied = "1";
            img.src = FALLBACK_IMG;
          }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-xs text-white/60">{item.brand || "—"}</div>
          {exactMatch ? (
            <span className="shrink-0 rounded-full border border-emerald-300/35 bg-emerald-300/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
              Exact match
            </span>
          ) : null}
        </div>
        <div className="mt-1 line-clamp-2 text-sm font-semibold">{item.name || "—"}</div>

        <div className="mt-2 flex flex-wrap gap-2">
          {(item.mainAccords ?? []).slice(0, 3).map((a, i) => (
            <span
              key={`${a}-${i}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
            >
              {a}
            </span>
          ))}
        </div>
        {String(item.source ?? "").toUpperCase() === "COMMUNITY" ? (
          <div className="mt-3 text-xs text-cyan-100/85">
            Created by @{String(item.createdByUsername ?? "unknown").replace(/^@+/, "")}
          </div>
        ) : null}
      </div>
    </button>
  );
});


export default function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // derive URL params (stable deps)
  const urlQuery = (params.get("q") ?? `${params.get("brand") ?? ""} ${params.get("fragrance") ?? ""}`).trim();
  const urlVisible = params.get("visible") ?? "10";

  const [searchText, setSearchText] = useState(urlQuery);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<FragranceSearchResult[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(() => clampVisible(Number(urlVisible)));

  const query = useMemo(() => searchText.trim(), [searchText]);
  const canSearch = query.length >= 3;

  const [didSearch, setDidSearch] = useState(false);

  // prevent re-hydrating on every param update (e.g., visible changes)
  const hydratedRef = useRef(false);

  //Abort in-flight search when a new one starts or when unmounting
  const searchAbortRef = useRef<AbortController | null>(null);

  //Sequence guard (still useful even with abort, as extra safety)
  const searchSeqRef = useRef(0);

  // Restore from sessionStorage when URL query changes
  useEffect(() => {
    const q = urlQuery;
    if (!q) return;
    setSearchText(q);

    const hydrateKey = q.toLowerCase();
    const last = (hydratedRef as any).currentKey;
    if (hydratedRef.current && last === hydrateKey) return;

    hydratedRef.current = true;
    (hydratedRef as any).currentKey = hydrateKey;

    const raw = sessionStorage.getItem(cacheKey(q));
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CachedSearch;
      if (!parsed?.results) return;

      setResults(parsed.results);
      setVisibleCount(clampVisible(parsed.visibleCount ?? 10));
      setDidSearch(true);

      requestAnimationFrame(() => {
        window.scrollTo({ top: parsed.scrollY ?? 0, behavior: "instant" as any });
      });
    } catch {
      // ignore bad cache
    }
  }, [urlQuery]);

  // cleanup any in-flight request on unmount
  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
    };
  }, []);

  const paramsString = useMemo(() => params.toString(), [params]);

  const saveCache = useCallback(
    (next: Partial<CachedSearch>) => {
      const q = next.query ?? query;
      if (!q) return;

      const payload: CachedSearch = {
        query: q,
        results: next.results ?? results,
        visibleCount: next.visibleCount ?? visibleCount,
        scrollY: next.scrollY ?? window.scrollY,
        savedAt: Date.now(),
      };

      sessionStorage.setItem(cacheKey(q), JSON.stringify(payload));
    },
    [query, results, visibleCount]
  );

  const onSearch = useCallback(async () => {
    setError(null);
    setDidSearch(true);

    if (!canSearch) {
      setError('Enter at least 3 characters. Example: "Dior Sauvage".');
      return;
    }

    // cancel previous request if any
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;

    setLoading(true);
    const nextVisible = 10;
    setVisibleCount(nextVisible);

    const seq = ++searchSeqRef.current;

    try {
      //requires updated fragrances.ts: searchFragrances(params, { signal })
      const [fragellaData, communityData] = await Promise.all([
        searchFragrances({ q: query, limit: 50, persist: true }, { signal: ctrl.signal }),
        searchCommunityFragrances({ q: query, limit: 50 }, { signal: ctrl.signal }),
      ]);
      
      if (ctrl.signal.aborted) return;
      if (seq !== searchSeqRef.current) return;
      
      const mergedRaw = [
        ...(Array.isArray(communityData) ? communityData : []),
        ...(Array.isArray(fragellaData) ? fragellaData : []),
      ];
      
      // de-dupe by source + externalId
      const seen = new Set<string>();
      const merged = mergedRaw.filter((item: any) => {
        const src = String(item?.source ?? "fragella").toLowerCase();
        const id = String(item?.externalId ?? item?.external_id ?? "").trim();
        if (!id) return true;
        const key = `${src}:${id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      const ranked = rankSearchResults(merged.map(normalize), query);
      const list = ranked.slice(0, 50);
      setResults(list);
      
      if (list.length === 0) setError("No results found. Try a different spelling.");
      

      setParams(
        {
          q: query,
          visible: String(nextVisible),
        },
        { replace: true }
      );

      saveCache({
        query,
        results: list,
        visibleCount: nextVisible,
        scrollY: 0,
      });

      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" as any }));
    } catch (e: any) {
      if (ctrl.signal.aborted) return;
      if (seq !== searchSeqRef.current) return;

      setResults([]);
      setError(e?.message || "Search failed.");
    } finally {
      // only clear loading if this request is still the active one
      if (!ctrl.signal.aborted && seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [canSearch, query, saveCache, setParams]);

  const visibleResults = useMemo(
    () => results.slice(0, Math.min(visibleCount, 50)),
    [results, visibleCount]
  );

  const canShowMore = results.length > visibleCount && visibleCount < Math.min(50, results.length);

  const hasStrongMatch = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return false;

    return results.some((r) => {
      const combined = `${r.brand ?? ""} ${r.name ?? ""}`.toLowerCase();
      return combined.includes(q);
    });
  }, [results, query]);

  const showProminentCantFind =
    didSearch && !loading && results.length > 0 && query.length >= 3 && !hasStrongMatch;

  const onOpenResult = useCallback(
    (item: FragranceSearchResult, idx: number) => {
      saveCache({ scrollY: window.scrollY });

      const routeId = encodeURIComponent(makeRouteId(item, idx));
      navigate(`/fragrances/${routeId}`, {
        state: {
          fragrance: item,
          from: { pathname: "/search", search: paramsString ? `?${paramsString}` : "" },
        },
      });
    },
    [navigate, paramsString, saveCache]
  );

  const onShowMore = useCallback(() => {
    const next = Math.min(50, results.length, visibleCount + 10);
    setVisibleCount(next);

    setParams(
      {
        q: query,
        visible: String(next),
      },
      { replace: true }
    );

    saveCache({ visibleCount: next, scrollY: window.scrollY });
  }, [query, results.length, saveCache, setParams, visibleCount]);

  const goToCommunityCreator = useCallback(() => {
    const paramsString = params.toString();
    navigate("/fragrances/new-community?source=COMMUNITY", {
      state: {
        from: { pathname: "/search", search: paramsString ? `?${paramsString}` : "" },
        createCommunity: true,
        seedQuery: query,
      },
    });
  }, [navigate, params, query]);

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/15 bg-black/30 p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Explorer</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Search</h1>
            <p className="mt-1 text-sm text-white/65">Find by brand, fragrance, or both.</p>
          </div>

          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
            onClick={() => navigate("/home")}
          >
            Back
          </Button>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/6 p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-white/60">Search query</div>
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20 text-white placeholder:text-white/40"
                placeholder="Dior Sauvage"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
              />
            </div>

            <Button className="h-11 rounded-xl bg-white text-black hover:bg-white/90 px-5" onClick={onSearch} disabled={loading || !canSearch}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6">
          {visibleResults.length > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/12 bg-black/25 px-4 py-3">
              <div className="text-sm text-white/70">
                Showing <span className="font-semibold text-white">{visibleResults.length}</span> of{" "}
                <span className="font-semibold text-white">{Math.min(results.length, 50)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                  onClick={goToCommunityCreator}
                >
                  Not seeing it?
                </Button>

                {canShowMore && (
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                    onClick={onShowMore}
                  >
                    More results
                  </Button>
                )}
              </div>
            </div>
          )}

          {showProminentCantFind && (
            <div className="mb-4 rounded-3xl border border-amber-200/25 bg-[linear-gradient(135deg,rgba(255,194,94,0.16),rgba(255,255,255,0.05))] p-6">
              <div className="text-sm font-semibold">Can’t find what you’re looking for?</div>
              <div className="mt-1 text-sm text-white/70">
                Add it as a community fragrance (private by default).
              </div>
              <div className="mt-4">
                <Button className="h-10 rounded-xl bg-white text-black hover:bg-white/90 px-5" onClick={goToCommunityCreator}>
                  Add community fragrance
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleResults.map((item, idx) => (
              <div key={`${item.source ?? "x"}:${item.externalId ?? "noid"}:${idx}`} style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }} className="stacta-fade-rise">
                <ResultCard
                  item={item}
                  idx={idx}
                  exactMatch={isExactResult(item, query)}
                  onOpen={onOpenResult}
                />
              </div>
            ))}
          </div>

          {didSearch && !loading && query.length >= 3 && (
            <div className="mt-6 flex items-center justify-center">
              <button
                className="text-sm text-white/60 underline-offset-4 hover:underline"
                onClick={goToCommunityCreator}
              >
                Can’t find what you’re looking for? Add it as a community fragrance.
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
