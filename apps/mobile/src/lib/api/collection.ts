import { authedFetch } from "./client";

type CollectionSource = "FRAGELLA" | "COMMUNITY";

export type AddCollectionItemRequest = {
  source: CollectionSource;
  externalId: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  collectionTag?: "BLIND_BUY" | "SAMPLED_FIRST" | "RECOMMENDED" | "HYPE_TREND" | "DEAL_DISCOUNT" | "GIFT" | null;
};

export type AddCollectionItemResponse = {
  item: {
    source: string;
    externalId: string;
  };
  status: "ADDED" | "ALREADY_EXISTS";
};

export function addToCollection(body: AddCollectionItemRequest) {
  return authedFetch<AddCollectionItemResponse>("/api/v1/collection", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function removeFromCollection(params: { source: CollectionSource; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/collection?source=${source}&externalId=${externalId}`, {
    method: "DELETE",
  });
}

export function removeFromWishlist(params: { source: CollectionSource; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/wishlist?source=${source}&externalId=${externalId}`, {
    method: "DELETE",
  });
}

export function addTopFragrance(params: { source: CollectionSource; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/collection/top?source=${source}&externalId=${externalId}`, {
    method: "POST",
  });
}

export function removeTopFragrance(params: { source: CollectionSource; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/collection/top?source=${source}&externalId=${externalId}`, {
    method: "DELETE",
  });
}
