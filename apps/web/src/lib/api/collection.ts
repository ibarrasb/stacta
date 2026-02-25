import { authedFetch } from "@/lib/api/client";
import type { CollectionItem } from "@/lib/api/types";

export type AddCollectionItemRequest = {
  source: "FRAGELLA" | "COMMUNITY";
  externalId: string;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
};

export function addToCollection(body: AddCollectionItemRequest) {
  return authedFetch<CollectionItem>("/api/v1/collection", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function removeFromCollection(params: { source: "FRAGELLA" | "COMMUNITY"; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/collection?source=${source}&externalId=${externalId}`, {
    method: "DELETE",
  });
}

export function addTopFragrance(params: { source: "FRAGELLA" | "COMMUNITY"; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/collection/top?source=${source}&externalId=${externalId}`, {
    method: "POST",
  });
}

export function removeTopFragrance(params: { source: "FRAGELLA" | "COMMUNITY"; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/collection/top?source=${source}&externalId=${externalId}`, {
    method: "DELETE",
  });
}

export function addToWishlist(body: AddCollectionItemRequest) {
  return authedFetch<CollectionItem>("/api/v1/wishlist", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function removeFromWishlist(params: { source: "FRAGELLA" | "COMMUNITY"; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/wishlist?source=${source}&externalId=${externalId}`, {
    method: "DELETE",
  });
}
