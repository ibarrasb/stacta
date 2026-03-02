import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequireAuth from "./RequireAuth";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("@/lib/auth", () => ({
  getAccessToken: mocks.getAccessToken,
}));

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading while token check is in progress", () => {
    mocks.getAccessToken.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={(
              <RequireAuth>
                <div>private-area</div>
              </RequireAuth>
            )}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders children when authenticated", async () => {
    mocks.getAccessToken.mockResolvedValue("token-123");

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={(
              <RequireAuth>
                <div>private-area</div>
              </RequireAuth>
            )}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("private-area")).toBeInTheDocument();
  });

  it("redirects to sign-in and preserves the source path when unauthenticated", async () => {
    mocks.getAccessToken.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/private?tab=activity"]}>
        <Routes>
          <Route
            path="/private"
            element={(
              <RequireAuth>
                <div>private-area</div>
              </RequireAuth>
            )}
          />
          <Route path="/sign-in" element={<SignInProbe />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("sign-in:/private?tab=activity")).toBeInTheDocument();
    });
  });
});

function SignInProbe() {
  const location = useLocation();
  return (
    <div>
      sign-in:{(location.state as { from?: string } | null)?.from ?? ""}
    </div>
  );
}
