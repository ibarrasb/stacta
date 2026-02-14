import { authedFetch } from "@/lib/api/client";
import type { MeResponse, UpdateMeRequest } from "@/lib/api/types";

export const getMe = () => authedFetch<MeResponse>("/api/v1/me");

export const updateMe = (body: UpdateMeRequest) =>
  authedFetch<MeResponse>("/api/v1/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
