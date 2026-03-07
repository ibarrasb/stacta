import { fetchAuthSession } from "aws-amplify/auth";

const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const REFRESH_SKEW_SECONDS = 60 * 5;

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

export function clearApiSessionCache() {
  cachedSession = null;
  inflightSessionPromise = null;
}

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

async function getSessionSmart() {
  if (cachedSession && !isExpiringSoon(cachedSession)) return cachedSession;

  if (!inflightSessionPromise) {
    inflightSessionPromise = (async () => {
      const s1 = await fetchAuthSession({ forceRefresh: false });
      if (s1 && getAccessToken(s1) && !isExpiringSoon(s1)) return s1;
      return fetchAuthSession({ forceRefresh: true });
    })()
      .then((session) => {
        cachedSession = session;
        return session;
      })
      .finally(() => {
        inflightSessionPromise = null;
      });
  }

  return inflightSessionPromise;
}

export async function authedFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  retrying = false
): Promise<T> {
  if (!API_BASE) {
    throw new Error("EXPO_PUBLIC_API_URL is not set. Cannot call API.");
  }

  const session = await getSessionSmart();
  const token = getAccessToken(session);
  if (!token) {
    throw new ApiError("Not authenticated", 401, null);
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const isFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !headers.has("Content-Type") && !isFormDataBody) {
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
    if (res.status === 401 && !retrying) {
      clearApiSessionCache();
      const method = (init.method ?? "GET").toUpperCase();
      if (method === "GET" || method === "HEAD") {
        return authedFetch<T>(path, init, true);
      }
    }
    throw new ApiError(deriveApiErrorMessage(path, res.status, res.statusText, body), res.status, body);
  }

  return body as T;
}
