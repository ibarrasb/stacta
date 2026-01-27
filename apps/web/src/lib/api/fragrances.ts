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
};

export function searchFragrances(params: { q: string; limit?: number; persist?: boolean }) {
  const q = encodeURIComponent(params.q);
  const limit = params.limit ?? 20;
  const persist = params.persist ?? false;
  return authedFetch<FragranceSearchResult[]>(
    `/api/v1/fragrances/search?q=${q}&limit=${limit}&persist=${persist}`
  );
}
