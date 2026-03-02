import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RedirectIfAuthed from "./RedirectIfAuthed";

const mocks = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("@/lib/auth", () => ({
  getAccessToken: mocks.getAccessToken,
}));

describe("RedirectIfAuthed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading while token check is in progress", () => {
    mocks.getAccessToken.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <Routes>
          <Route
            path="/sign-in"
            element={(
              <RedirectIfAuthed>
                <div>sign-in-form</div>
              </RedirectIfAuthed>
            )}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("redirects authenticated users to home", async () => {
    mocks.getAccessToken.mockResolvedValue("token-123");

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <Routes>
          <Route
            path="/sign-in"
            element={(
              <RedirectIfAuthed>
                <div>sign-in-form</div>
              </RedirectIfAuthed>
            )}
          />
          <Route path="/home" element={<div>home-page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("home-page")).toBeInTheDocument();
  });

  it("renders children when unauthenticated or token check fails", async () => {
    mocks.getAccessToken.mockRejectedValue(new Error("network"));

    render(
      <MemoryRouter initialEntries={["/sign-in"]}>
        <Routes>
          <Route
            path="/sign-in"
            element={(
              <RedirectIfAuthed to="/dashboard">
                <div>sign-in-form</div>
              </RedirectIfAuthed>
            )}
          />
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("sign-in-form")).toBeInTheDocument();
    });
  });
});
