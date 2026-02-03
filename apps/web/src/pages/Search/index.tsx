// apps/web/src/pages/Search/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchFragrances, type FragranceSearchResult } from "@/lib/api/fragrances";
import AddCommunityFragranceDialog from "@/components/fragrances/AddCommunityFragranceDialog";

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

function makeQuery(brand: string, fragrance: string) {
  const b = brand.trim();
  const f = fragrance.trim();
  if (!b || !f) return "";
  return `${b} ${f}`.trim();
}

function cacheKey(q: string) {
  return `stacta:search:${encodeURIComponent(q)}`;
}

type CachedSearch = {
  brand: string;
  fragrance: string;
  query: string;
  results: FragranceSearchResult[];
  visibleCount: number;
  scrollY: number;
  savedAt: number;
};

function clampVisible(v: number) {
  if (!Number.isFinite(v)) return 10;
  return Math.min(20, Math.max(10, v));
}

// Memoized card: reduces rerender cost when typing / toggling dialogs / etc.
const ResultCard = React.memo(function ResultCard({
  item,
  idx,
  onOpen,
}: {
  item: FragranceSearchResult;
  idx: number;
  onOpen: (item: FragranceSearchResult, idx: number) => void;
}) {
  //removed unused routeId + key memo (lint + perf): parent provides key already
  return (
    <button
      className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-left transition hover:bg-white/7"
      onClick={() => onOpen(item, idx)}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-white/5">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={`${item.brand} ${item.name}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
            No image
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="text-xs text-white/60">{item.brand || "—"}</div>
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
      </div>
    </button>
  );
});

export default function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // derive URL params (stable deps)
  const urlBrand = params.get("brand") ?? "";
  const urlFragrance = params.get("fragrance") ?? "";
  const urlVisible = params.get("visible") ?? "10";

  const [brand, setBrand] = useState(urlBrand);
  const [fragrance, setFragrance] = useState(urlFragrance);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<FragranceSearchResult[]>([]);
  const [visibleCount, setVisibleCount] = useState<number>(() => clampVisible(Number(urlVisible)));

  const query = useMemo(() => makeQuery(brand, fragrance), [brand, fragrance]);
  const canSearch = brand.trim().length > 0 && fragrance.trim().length > 0 && query.length >= 3;

  const [addOpen, setAddOpen] = useState(false);
  const [didSearch, setDidSearch] = useState(false);

  // prevent re-hydrating on every param update (e.g., visible changes)
  const hydratedRef = useRef(false);

  //Abort in-flight search when a new one starts or when unmounting
  const searchAbortRef = useRef<AbortController | null>(null);

  //Sequence guard (still useful even with abort, as extra safety)
  const searchSeqRef = useRef(0);

  // Restore from sessionStorage when URL brand/fragrance change
  useEffect(() => {
    const b = urlBrand;
    const f = urlFragrance;
    if (!b || !f) return;

    const q = makeQuery(b, f);
    if (!q) return;

    setBrand(b);
    setFragrance(f);

    const hydrateKey = `${b}||${f}`;
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
  }, [urlBrand, urlFragrance]);

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
        brand: next.brand ?? brand,
        fragrance: next.fragrance ?? fragrance,
        query: q,
        results: next.results ?? results,
        visibleCount: next.visibleCount ?? visibleCount,
        scrollY: next.scrollY ?? window.scrollY,
        savedAt: Date.now(),
      };

      sessionStorage.setItem(cacheKey(q), JSON.stringify(payload));
    },
    [brand, fragrance, query, results, visibleCount]
  );

  const onSearch = useCallback(async () => {
    setError(null);
    setDidSearch(true);

    if (!canSearch) {
      setError('Enter brand first, then fragrance name. Example: "Dior" + "Sauvage".');
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
      const data = await searchFragrances(
        { q: query, limit: 20, persist: true },
        { signal: ctrl.signal }
      );

      if (ctrl.signal.aborted) return;
      if (seq !== searchSeqRef.current) return;

      const list = Array.isArray(data) ? data.map(normalize).slice(0, 20) : [];
      setResults(list);

      if (list.length === 0) setError("No results found. Try a different spelling.");

      setParams(
        {
          brand: brand.trim(),
          fragrance: fragrance.trim(),
          visible: String(nextVisible),
        },
        { replace: true }
      );

      saveCache({
        brand: brand.trim(),
        fragrance: fragrance.trim(),
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
  }, [brand, canSearch, fragrance, query, saveCache, setParams]);

  const visibleResults = useMemo(
    () => results.slice(0, Math.min(visibleCount, 20)),
    [results, visibleCount]
  );

  const canShowMore = results.length > 10 && visibleCount < 20;

  const hasStrongMatch = useMemo(() => {
    const b = brand.trim().toLowerCase();
    const f = fragrance.trim().toLowerCase();
    if (!b || !f) return false;

    return results.some((r) => {
      const rb = (r.brand ?? "").toLowerCase();
      const rn = (r.name ?? "").toLowerCase();
      return rb.includes(b) && rn.includes(f);
    });
  }, [results, brand, fragrance]);

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
    const next = Math.min(20, visibleCount + 10);
    setVisibleCount(next);

    setParams(
      {
        brand: brand.trim(),
        fragrance: fragrance.trim(),
        visible: String(next),
      },
      { replace: true }
    );

    saveCache({ visibleCount: next, scrollY: window.scrollY });
  }, [brand, fragrance, saveCache, setParams, visibleCount]);

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
            <p className="mt-1 text-sm text-white/60">Enter the brand first, then the fragrance name.</p>
          </div>

          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
            onClick={() => navigate("/home")}
          >
            Back
          </Button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <div className="mb-1 text-xs font-medium text-white/60">Brand</div>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                placeholder="Dior"
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-white/60">Fragrance</div>
              <Input
                value={fragrance}
                onChange={(e) => setFragrance(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                placeholder="Sauvage"
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
              />
            </div>

            <Button className="h-10 rounded-xl px-5" onClick={onSearch} disabled={loading || !canSearch}>
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
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-white/70">
                Showing <span className="font-semibold text-white">{visibleResults.length}</span> of{" "}
                <span className="font-semibold text-white">{Math.min(results.length, 20)}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                  onClick={() => setAddOpen(true)}
                >
                  Not seeing it?
                </Button>

                {canShowMore && (
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                    onClick={onShowMore}
                  >
                    More results
                  </Button>
                )}
              </div>
            </div>
          )}

          {showProminentCantFind && (
            <div className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">Can’t find what you’re looking for?</div>
              <div className="mt-1 text-sm text-white/60">
                Add it as a community fragrance (private by default).
              </div>
              <div className="mt-4">
                <Button className="h-10 rounded-xl px-5" onClick={() => setAddOpen(true)}>
                  Add community fragrance
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleResults.map((item, idx) => (
              <ResultCard
                key={`${item.source ?? "x"}:${item.externalId ?? "noid"}:${idx}`}
                item={item}
                idx={idx}
                onOpen={onOpenResult}
              />
            ))}
          </div>

          {didSearch && !loading && query.length >= 3 && (
            <div className="mt-6 flex items-center justify-center">
              <button
                className="text-sm text-white/60 underline-offset-4 hover:underline"
                onClick={() => setAddOpen(true)}
              >
                Can’t find what you’re looking for? Add it as a community fragrance.
              </button>
            </div>
          )}
        </div>

        <AddCommunityFragranceDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          initialBrand={brand}
          initialName={fragrance}
          onCreated={(created) => {
            const id = created.externalId ?? "";
            navigate(`/fragrances/${encodeURIComponent(id)}`, {
              state: {
                fragrance: created,
                from: { pathname: "/search", search: paramsString ? `?${paramsString}` : "" },
              },
            });
          }}
        />
      </div>
    </div>
  );
}
