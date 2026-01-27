import { authedFetch } from "@/lib/api/client";
import type { MeResponse } from "@/lib/api/types";

export type CreateOnboardingRequest = {
  displayName: string;
  username?: string;
};

export const createOnboarding = (body: CreateOnboardingRequest) =>
  authedFetch<MeResponse>("/api/v1/onboarding", {
    method: "POST",
    body: JSON.stringify(body),
  });
