import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAuthSession = vi.fn();

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession,
}));

function mockSession(token: string, expOffsetSeconds = 3600) {
  return {
    tokens: {
      accessToken: {
        toString: () => token,
        payload: { exp: Math.floor(Date.now() / 1000) + expOffsetSeconds },
      },
    },
  };
}

describe("authedFetch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("VITE_API_URL", "https://api.example.test");
  });

  it("adds bearer auth and JSON content type when body is present", async () => {
    fetchAuthSession.mockResolvedValue(mockSession("token-123"));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { authedFetch } = await import("./client");
    const res = await authedFetch<{ ok: boolean }>("/hello", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });

    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/hello",
      expect.any(Object)
    );

    const callInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(callInit.headers);
    expect(headers.get("authorization")).toBe("Bearer token-123");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("retries once on 401 for idempotent requests", async () => {
    fetchAuthSession.mockResolvedValue(mockSession("token-123"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "unauthorized" }), {
          status: 401,
          statusText: "Unauthorized",
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const { authedFetch } = await import("./client");
    const res = await authedFetch<{ ok: boolean }>("/retry-me");

    expect(res).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 401 for non-idempotent requests", async () => {
    fetchAuthSession.mockResolvedValue(mockSession("token-123"));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ApiError, authedFetch } = await import("./client");

    await expect(
      authedFetch("/submit", { method: "POST", body: JSON.stringify({}) })
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
