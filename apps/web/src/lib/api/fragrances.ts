// apps/web/src/lib/api/fragrances.ts
import { authedFetch } from "@/lib/api/client";

export type NoteDto = { id?: string | null; name: string; imageUrl: string | null };
export type NotesDto = { top: NoteDto[]; middle: NoteDto[]; base: NoteDto[] };

export type RankingDto = { name: string; score: number | null };

export type FragranceSearchResult = {
  source: string | null;
  externalId: string | null;

  name: string;
  brand: string;
  year: string | null;
  imageUrl: string | null;
  imageObjectKey?: string | null;
  gender: string | null;

  rating: string | null;
  price: string | null;
  priceValue: string | null;
  purchaseUrl: string | null;

  oilType: string | null;
  longevity: string | null;
  sillage: string | null;
  confidence: string | null;
  popularity: string | null;

  mainAccords: string[];
  generalNotes: string[];

  mainAccordsPercentage: Record<string, string> | null;

  seasonRanking: RankingDto[];
  occasionRanking: RankingDto[];

  notes: NotesDto | null;

  concentration?: string | null;
  longevityScore?: number | null;
  sillageScore?: number | null;
  visibility?: "PRIVATE" | "PUBLIC" | string | null;
  createdByUserId?: string | null;
  createdByUsername?: string | null;
  ratingCount?: number | null;
  userRating?: number | null;
};

export type FragranceRatingSummary = {
  average: number;
  count: number;
  userRating: number | null;
};

export type CommunityVoteSelection = {
  longevityScore: number | null;
  sillageScore: number | null;
  pricePerception:
    | "VERY_OVERPRICED"
    | "A_BIT_OVERPRICED"
    | "FAIR"
    | "GOOD_VALUE"
    | "EXCELLENT_VALUE"
    | "OVERPRICED"
    | "GREAT_VALUE"
    | null;
  seasonVotes: string[];
  occasionVotes: string[];
};

export type CommunityVoteSummary = {
  voters: number;
  longevityRanking: RankingDto[];
  sillageRanking: RankingDto[];
  seasonRanking: RankingDto[];
  occasionRanking: RankingDto[];
  priceRanking: RankingDto[];
  userVote: CommunityVoteSelection | null;
};

export type UpsertCommunityVoteRequest = {
  longevityScore?: number | null;
  sillageScore?: number | null;
  pricePerception?:
    | "VERY_OVERPRICED"
    | "A_BIT_OVERPRICED"
    | "FAIR"
    | "GOOD_VALUE"
    | "EXCELLENT_VALUE"
    | "OVERPRICED"
    | "GREAT_VALUE"
    | null;
  seasonVotes?: string[];
  occasionVotes?: string[];
};

export type NoteDictionaryItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  usageCount: number | null;
};

export type CreateCommunityFragranceRequest = {
  name: string;
  brand: string;
  year?: string | null;
  imageObjectKey?: string | null;
  imageUrl?: string | null;
  purchaseUrl?: string | null;
  concentration?: string | null;
  longevityScore?: number | null; // 1-5
  sillageScore?: number | null; // 1-5
  confidence?: string | null;
  popularity?: string | null;
  mainAccords?: string[];
  mainAccordsPercentage?: Record<string, string> | null;
  visibility?: "PRIVATE" | "PUBLIC";
  topNoteIds?: string[];
  middleNoteIds?: string[];
  baseNoteIds?: string[];
  topNoteNames?: string[];
  middleNoteNames?: string[];
  baseNoteNames?: string[];
};

/**
 * -----------------------------
 * Tiny in-memory request cache
 * -----------------------------
 */
const TTL_SEARCH_MS = 20_000;
const TTL_DETAIL_MS = 60_000;
type CacheEntry<T> = { value: T; expiresAt: number };

const valueCache = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

function now() {
  return Date.now();
}

function getCached<T>(key: string): T | null {
  const hit = valueCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < now()) {
    valueCache.delete(key);
    return null;
  }
  return hit.value as T;
}

function setCached<T>(key: string, value: T, ttlMs: number) {
  valueCache.set(key, { value, expiresAt: now() + ttlMs });
}

async function deduped<T>(key: string, fn: () => Promise<T>, ttlMs?: number): Promise<T> {
  const cached = ttlMs ? getCached<T>(key) : null;
  if (cached) return cached;

  const p0 = inflight.get(key) as Promise<T> | undefined;
  if (p0) return p0;

  const p = fn()
    .then((res) => {
      if (ttlMs) setCached(key, res, ttlMs);
      return res;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, p);
  return p;
}

// cache helper that is safe with AbortSignal
async function cachedButNotDedupedIfAborted<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number,
  signal?: AbortSignal
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return cached;

  // If a signal is provided, DO NOT share inflight promise
  // (otherwise one abort cancels shared request for all listeners)
  if (signal) {
    const res = await fn();
    setCached(key, res, ttlMs);
    return res;
  }

  // If no signal, safe to dedupe
  return deduped<T>(key, fn, ttlMs);
}

const DEFAULT_PERSIST = true;

export function searchFragrances(
  params: { q: string; limit?: number; persist?: boolean },
  opts?: { signal?: AbortSignal }
) {
  const q = encodeURIComponent(params.q);
  const limit = params.limit ?? 20;
  const persist = params.persist ?? DEFAULT_PERSIST;

  const url = `/api/v1/fragrances/search?q=${q}&limit=${limit}&persist=${persist}`;
  const key = `GET:${url}`;

  return cachedButNotDedupedIfAborted(
    key,
    () => authedFetch<FragranceSearchResult[]>(url, { signal: opts?.signal }),
    TTL_SEARCH_MS,
    opts?.signal
  );
}

export function searchNotes(
  params: { search: string; limit?: number },
  opts?: { signal?: AbortSignal }
) {
  const q = encodeURIComponent(params.search);
  const limit = params.limit ?? 30;
  const url = `/api/v1/notes?search=${q}&limit=${limit}`;
  const key = `GET:${url}`;

  return cachedButNotDedupedIfAborted(
    key,
    () => authedFetch<NoteDictionaryItem[]>(url, { signal: opts?.signal }),
    TTL_SEARCH_MS,
    opts?.signal
  );
}

export function createCommunityFragrance(body: CreateCommunityFragranceRequest) {
  return authedFetch<FragranceSearchResult>(`/api/v1/community-fragrances`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateCommunityFragrance(externalId: string, body: CreateCommunityFragranceRequest) {
  return authedFetch<FragranceSearchResult>(`/api/v1/community-fragrances/${encodeURIComponent(externalId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteCommunityFragrance(externalId: string) {
  return authedFetch<void>(`/api/v1/community-fragrances/${encodeURIComponent(externalId)}`, {
    method: "DELETE",
  });
}

export function rateFragrance(
  params: { source?: "FRAGELLA" | "COMMUNITY"; externalId: string; rating: number }
) {
  const source = params.source ?? "FRAGELLA";
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<FragranceRatingSummary>(`/api/v1/fragrances/${externalId}/rating?source=${source}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating: params.rating }),
  });
}

export function getFragranceRatingSummary(
  params: { source?: "FRAGELLA" | "COMMUNITY"; externalId: string }
) {
  const source = params.source ?? "FRAGELLA";
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<FragranceRatingSummary>(`/api/v1/fragrances/${externalId}/rating?source=${source}`);
}


export function searchCommunityFragrances(
  params: { q: string; limit?: number },
  opts?: { signal?: AbortSignal }
) {
  const q = encodeURIComponent(params.q);
  const limit = params.limit ?? 20;
  const url = `/api/v1/community-fragrances/search?q=${q}&limit=${limit}`;
  const key = `GET:${url}`;

  return cachedButNotDedupedIfAborted(
    key,
    () => authedFetch<FragranceSearchResult[]>(url, { signal: opts?.signal }),
    TTL_SEARCH_MS,
    opts?.signal
  );
}

export function getFragranceDetail(
  params: { source?: "FRAGELLA" | "COMMUNITY"; externalId: string },
  opts?: { signal?: AbortSignal; bypassCache?: boolean }
) {
  const source = params.source ?? "FRAGELLA";
  const externalId = encodeURIComponent(params.externalId);
  const url = `/api/v1/fragrances/${externalId}?source=${source}`;
  const key = `GET:${url}`;

  if (opts?.bypassCache) {
    return authedFetch<FragranceSearchResult>(url, { signal: opts?.signal });
  }

  return cachedButNotDedupedIfAborted(
    key,
    () => authedFetch<FragranceSearchResult>(url, { signal: opts?.signal }),
    TTL_DETAIL_MS,
    opts?.signal
  );
}

export function getCommunityVoteSummary(externalId: string) {
  return authedFetch<CommunityVoteSummary>(`/api/v1/community-fragrances/${encodeURIComponent(externalId)}/votes`);
}

export function upsertCommunityVote(externalId: string, body: UpsertCommunityVoteRequest) {
  return authedFetch<CommunityVoteSummary>(`/api/v1/community-fragrances/${encodeURIComponent(externalId)}/votes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function getFragranceVoteSummary(params: { source?: "FRAGELLA" | "COMMUNITY"; externalId: string }) {
  const source = params.source ?? "FRAGELLA";
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<CommunityVoteSummary>(`/api/v1/fragrances/${externalId}/votes?source=${source}`);
}

export function upsertFragranceVote(
  params: { source?: "FRAGELLA" | "COMMUNITY"; externalId: string },
  body: UpsertCommunityVoteRequest
) {
  const source = params.source ?? "FRAGELLA";
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<CommunityVoteSummary>(`/api/v1/fragrances/${externalId}/votes?source=${source}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
