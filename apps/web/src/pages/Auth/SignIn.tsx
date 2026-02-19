// apps/web/src/pages/Auth/SignIn.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authSignIn } from "@/lib/auth";

import { ApiError } from "@/lib/api/client";
import { getMe } from "@/lib/api/me";
import { createOnboarding } from "@/lib/api/onboarding";

const PENDING_DISPLAY_NAME_KEY = "stacta:pendingDisplayName";
const PENDING_USERNAME_KEY = "stacta:pendingUsername";
const ONBOARDED_KEY = "stacta:onboardedSub";

function friendlyFetchError(err: unknown) {
  const msg = (err as any)?.message || "";
  if (typeof msg === "string" && msg.toLowerCase().includes("failed to fetch")) {
    return "Couldn’t reach the API. Check VITE_API_URL (should be http://localhost:8081) and that your backend is running.";
  }
  return msg || "Network error calling API.";
}

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // where to go after login (set by RequireAuth)
  const from = (location.state as any)?.from || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureOnboarded() {
    try {
      // already onboarded
      const me = await getMe();
      if (me?.cognitoSub) localStorage.setItem(ONBOARDED_KEY, me.cognitoSub);

      // If we ever had pending onboarding fields, clear them
      localStorage.removeItem(PENDING_DISPLAY_NAME_KEY);
      localStorage.removeItem(PENDING_USERNAME_KEY);
      return;
    } catch (e) {
      // expected on first login: 404 { error: "NOT_ONBOARDED" }
      if (e instanceof ApiError && e.status === 404) {
        const displayName = (localStorage.getItem(PENDING_DISPLAY_NAME_KEY) || "").trim();
        const username = (localStorage.getItem(PENDING_USERNAME_KEY) || "").trim();

        const body: { displayName: string; username?: string } = {
          displayName: displayName || "New user",
          ...(username ? { username } : {}),
        };

        try {
          const created = await createOnboarding(body);
          if (created?.cognitoSub) localStorage.setItem(ONBOARDED_KEY, created.cognitoSub);

          // onboarding completed, clear pending values
          localStorage.removeItem(PENDING_DISPLAY_NAME_KEY);
          localStorage.removeItem(PENDING_USERNAME_KEY);
          return;
        } catch (err) {
          throw new Error(friendlyFetchError(err));
        }
      }

      throw new Error(friendlyFetchError(e));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await authSignIn(email.trim(), password);

      // run onboarding right after sign-in
      await ensureOnboarded();

      // go to the route they originally tried to hit
      navigate(from, { replace: true });
    } catch (err: any) {
      const name = err?.name || err?.code;
      const msg = err?.message || "Sign in failed.";

      if (name === "UserNotConfirmedException") {
        navigate(`/confirm?email=${encodeURIComponent(email.trim())}`, {
          replace: true,
          state: { from },
        });
        return;
      }

      if (name === "NotAuthorizedException") {
        setError("Wrong email or password.");
      } else if (name === "UserNotFoundException") {
        setError("No account found with that email.");
      } else if (name === "TooManyRequestsException") {
        setError("Too many attempts. Try again in a bit.");
      } else {
        // show onboarding / API errors if they happen
        setError(err?.message || msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 top-24 h-56 w-56 rounded-full bg-amber-400/18 blur-3xl" />
        <div className="absolute right-0 top-8 h-64 w-64 rounded-full bg-teal-400/14 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-2.5 py-1">
            <img
              src="/stacta.png"
              alt="Stacta"
              className="h-5 w-5 rounded-md object-contain"
              draggable={false}
            />
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">Stacta</span>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-white/65">Sign in to continue building your fragrance identity.</p>

          <div className="mt-5 rounded-3xl border border-white/15 bg-black/30 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-xs font-medium text-white/70">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-amber-200/35"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-white/70">Password</label>

                  <Link
                    to="/forgot-password"
                    className="text-xs text-white/70 hover:text-white hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>

                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-amber-200/35"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <Button className="h-11 w-full rounded-xl bg-white text-black hover:bg-white/90" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="pt-2 text-center text-sm text-white/60">
                New here?{" "}
                <Link to="/sign-up" className="font-semibold text-white/80 hover:text-white">
                  Create an account
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-6 text-center text-xs text-white/50">
            By signing in, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}
