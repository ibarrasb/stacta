// apps/web/src/lib/api/client.ts
import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = import.meta.env.VITE_API_URL as string | undefined;

// Refresh if token expires within this window
const REFRESH_SKEW_SECONDS = 60 * 5; // 5 minutes

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

function deriveApiErrorMessage(path: string, status: number, statusText: string, body: unknown) {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const detail = typeof obj.detail === "string" ? obj.detail.trim() : "";
    const message = typeof obj.message === "string" ? obj.message.trim() : "";
    const error = typeof obj.error === "string" ? obj.error.trim() : "";
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const best = detail || message || error || title;
    if (best) return best;
  }
  if (typeof body === "string" && body.trim()) return body.trim();
  return `API ${status} ${statusText} for ${path}`;
}

let cachedSession: Awaited<ReturnType<typeof fetchAuthSession>> | null = null;
let inflightSessionPromise: Promise<Awaited<ReturnType<typeof fetchAuthSession>>> | null = null;

function getAccessToken(session: any): string | null {
  return session?.tokens?.accessToken?.toString?.() ?? null;
}

function getAccessTokenExp(session: any): number | null {
  const payload = session?.tokens?.accessToken?.payload;
  const exp = payload?.exp;
  return typeof exp === "number" ? exp : null;
}

function isExpiringSoon(session: any): boolean {
  const exp = getAccessTokenExp(session);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= REFRESH_SKEW_SECONDS;
}

async function getSessionSmart(forceRefresh?: boolean) {
  if (!forceRefresh && cachedSession && !isExpiringSoon(cachedSession)) return cachedSession;

  if (!inflightSessionPromise) {
    inflightSessionPromise = (async () => {
      // Try without forcing refresh first
      const s1 = await fetchAuthSession({ forceRefresh: false });
      if (s1 && getAccessToken(s1) && !isExpiringSoon(s1)) return s1;

      // Force refresh only when needed
      const s2 = await fetchAuthSession({ forceRefresh: true });
      return s2;
    })()
      .then((s) => {
        cachedSession = s;
        return s;
      })
      .finally(() => {
        inflightSessionPromise = null;
      });
  }

  return inflightSessionPromise;
}

function isAbortError(e: any) {
  return e?.name === "AbortError";
}

export async function authedFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  _internal?: { retried401?: boolean }
): Promise<T> {
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not set. Cannot call API.");
  }

  // If caller already aborted, fail fast
  if (init.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const session = await getSessionSmart(false);
  const token = getAccessToken(session);

  if (!token) {
    throw new ApiError("Not authenticated", 401, null);
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e: any) {
    // let abort bubble up (Search uses this)
    if (isAbortError(e)) throw e;
    throw e;
  }

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
    // If we get a 401, clear cached session so next request re-checks/refreshes
    if (res.status === 401) {
      cachedSession = null;

      //retry ONCE for idempotent requests
      const method = (init.method ?? "GET").toUpperCase();
      const idempotent = method === "GET" || method === "HEAD";

      if (idempotent && !_internal?.retried401) {
        // force refresh then retry
        await getSessionSmart(true);
        return authedFetch<T>(path, init, { retried401: true });
      }
    }

    throw new ApiError(deriveApiErrorMessage(path, res.status, res.statusText, body), res.status, body);
  }

  return body as T;
}
