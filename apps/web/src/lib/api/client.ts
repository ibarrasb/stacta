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

export async function authedFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  // force refresh so you don’t randomly 401 after idle
  const session = await fetchAuthSession({ forceRefresh: true });
  const token = session.tokens?.accessToken?.toString();

  // if no token, fail fast (RequireAuth should redirect)
  if (!token) {
    throw new ApiError("Not authenticated", 401, null);
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

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
