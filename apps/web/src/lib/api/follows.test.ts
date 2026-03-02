import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptFollowRequest,
  declineFollowRequest,
  followUser,
  listFollowers,
  listFollowing,
  listPendingFollowRequests,
  unfollowUser,
} from "./follows";

const mocks = vi.hoisted(() => ({
  authedFetch: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  authedFetch: mocks.authedFetch,
}));

describe("follows API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authedFetch.mockResolvedValue({});
  });

  it("encodes usernames and uses correct methods for follow/unfollow", async () => {
    await followUser("john doe");
    await unfollowUser("john doe");

    expect(mocks.authedFetch).toHaveBeenNthCalledWith(1, "/api/v1/follows/john%20doe", {
      method: "POST",
    });
    expect(mocks.authedFetch).toHaveBeenNthCalledWith(2, "/api/v1/follows/john%20doe", {
      method: "DELETE",
    });
  });

  it("builds list queries with defaults and custom cursor", async () => {
    await listPendingFollowRequests();
    await listFollowers({ limit: 10, cursor: "abc123" });
    await listFollowing({ limit: 5 });

    expect(mocks.authedFetch).toHaveBeenNthCalledWith(1, "/api/v1/follows/requests?limit=20");
    expect(mocks.authedFetch).toHaveBeenNthCalledWith(2, "/api/v1/follows/followers?limit=10&cursor=abc123");
    expect(mocks.authedFetch).toHaveBeenNthCalledWith(3, "/api/v1/follows/following?limit=5");
  });

  it("encodes request ids for accept/decline endpoints", async () => {
    await acceptFollowRequest("req/1");
    await declineFollowRequest("req/1");

    expect(mocks.authedFetch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/follows/requests/req%2F1/accept",
      { method: "POST" }
    );
    expect(mocks.authedFetch).toHaveBeenNthCalledWith(
      2,
      "/api/v1/follows/requests/req%2F1/decline",
      { method: "POST" }
    );
  });
});
