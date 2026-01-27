import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * authedFetch returns parsed JSON (typed) by default.
 * If the endpoint returns no content (204) or empty body, it returns undefined.
 *
 * Usage:
 *   const me = await authedFetch<MeResponse>("/api/v1/me");
 *   await authedFetch<void>("/api/v1/logout", { method: "POST" });
 */
export async function authedFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Only set JSON content-type when sending a body and caller didn't override it
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  // Parse response safely (json if possible, otherwise text). Tolerate empty bodies.
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let body: unknown = undefined;

  if (res.status !== 204) {
    if (isJson) {
      body = await res.json().catch(() => undefined);
    } else {
      const text = await res.text().catch(() => "");
      body = text === "" ? undefined : text;
    }
  }

  if (!res.ok) {
    throw new ApiError(`API ${res.status} ${res.statusText} for ${path}`, res.status, body);
  }

  return body as T;
}
