// src/lib/api/usernames.ts
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8081";

export type UsernameAvailableResponse = {
  available: boolean;
  normalized: string;
  reason?: "AVAILABLE" | "TAKEN";
};

export class UsernameCheckError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "UsernameCheckError";
    this.status = status;
  }
}

export async function checkUsernameAvailable(
  username: string,
  signal?: AbortSignal
): Promise<UsernameAvailableResponse> {
  const url = `${API_BASE}/api/v1/usernames/available?username=${encodeURIComponent(username)}`;
  const res = await fetch(url, { signal });

  if (res.ok) {
    const data = (await res.json()) as Partial<UsernameAvailableResponse>;

    const reason =
      data.reason === "AVAILABLE" || data.reason === "TAKEN" ? data.reason : undefined;

    return {
      available: Boolean(data.available),
      normalized: typeof data.normalized === "string" ? data.normalized : username,
      reason,
    };
  }

  const text = await res.text().catch(() => "");
  throw new UsernameCheckError(`Username check failed (${res.status}) ${text}`, res.status);
}
