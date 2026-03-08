import { authedFetch } from "./client";

type CollectionSource = "FRAGELLA" | "COMMUNITY";

export function removeFromCollection(params: { source: CollectionSource; externalId: string }) {
  const source = encodeURIComponent(params.source);
  const externalId = encodeURIComponent(params.externalId);
  return authedFetch<void>(`/api/v1/collection?source=${source}&externalId=${externalId}`, {
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
