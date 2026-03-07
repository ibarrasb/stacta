import { authedFetch } from "./client";
import type { MeResponse, UpdateMeRequest } from "./types";

export function getMe() {
  return authedFetch<MeResponse>("/api/v1/me");
}

export function updateMe(body: UpdateMeRequest) {
  return authedFetch<MeResponse>("/api/v1/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
