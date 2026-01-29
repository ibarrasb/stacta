import { authedFetch } from "@/lib/api/client";

export type NoteDto = { name: string; imageUrl: string | null };
export type NotesDto = { top: NoteDto[]; middle: NoteDto[]; base: NoteDto[] };

export type RankingDto = { name: string; score: number | null };

export type FragranceSearchResult = {
  source: string | null;
  externalId: string | null;

  name: string;
  brand: string;
  year: string | null;
  imageUrl: string | null;
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

  //community-only (nullable for FRAGELLA)
  concentration?: string | null;
  longevityScore?: number | null;
  sillageScore?: number | null;
  visibility?: "PRIVATE" | "PUBLIC" | string | null;
  createdByUserId?: string | null; // UUID serialized as string in JSON
};


export function searchFragrances(params: { q: string; limit?: number; persist?: boolean }) {
  const q = encodeURIComponent(params.q);
  const limit = params.limit ?? 20;
  const persist = params.persist ?? true;
  return authedFetch<FragranceSearchResult[]>(
    `/api/v1/fragrances/search?q=${q}&limit=${limit}&persist=${persist}`
  );
}

export type NoteDictionaryItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  usageCount: number | null;
};

export function searchNotes(params: { search: string; limit?: number }) {
  const q = encodeURIComponent(params.search);
  const limit = params.limit ?? 30;
  return authedFetch<NoteDictionaryItem[]>(`/api/v1/notes?search=${q}&limit=${limit}`);
}

export type CreateCommunityFragranceRequest = {
  name: string;
  brand: string;
  year?: string | null;
  concentration?: string | null;
  longevityScore?: number | null; // 1-5
  sillageScore?: number | null;   // 1-5
  visibility?: "PRIVATE" | "PUBLIC";
  topNoteIds?: string[];
  middleNoteIds?: string[];
  baseNoteIds?: string[];
};

export function createCommunityFragrance(body: CreateCommunityFragranceRequest) {
  return authedFetch<FragranceSearchResult>(`/api/v1/community-fragrances`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function searchCommunityFragrances(params: { q: string; limit?: number }) {
  const q = encodeURIComponent(params.q);
  const limit = params.limit ?? 20;
  return authedFetch<FragranceSearchResult[]>(
    `/api/v1/community-fragrances/search?q=${q}&limit=${limit}`
  );
}

export function getFragranceDetail(params: { source?: "FRAGELLA" | "COMMUNITY"; externalId: string }) {
  const source = params.source ?? "FRAGELLA";
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<FragranceSearchResult>(`/api/v1/fragrances/${externalId}?source=${source}`);
}