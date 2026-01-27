import { authedFetch } from "@/lib/api/client";
import type { MeResponse } from "@/lib/api/types";

export const getMe = () => authedFetch<MeResponse>("/api/v1/me");
