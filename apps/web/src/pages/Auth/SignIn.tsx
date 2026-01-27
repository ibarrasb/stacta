// apps/web/src/pages/Auth/SignIn.tsx
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authSignIn } from "@/lib/auth";
import { authedFetch } from "@/lib/api/client";

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
    let meRes: Response;

    try {
      meRes = await authedFetch("/api/v1/me");
    } catch (e) {
      throw new Error(friendlyFetchError(e));
    }

    //already onboarded
    if (meRes.ok) {
      const me = await meRes.json();
      if (me?.cognitoSub) localStorage.setItem(ONBOARDED_KEY, me.cognitoSub);

      // If we ever had pending onboarding fields, clear them
      localStorage.removeItem(PENDING_DISPLAY_NAME_KEY);
      localStorage.removeItem(PENDING_USERNAME_KEY);
      return;
    }

    // expected on first login: 404 { error: "NOT_ONBOARDED" }
    if (meRes.status === 404) {
      const displayName = (localStorage.getItem(PENDING_DISPLAY_NAME_KEY) || "").trim();
      const username = (localStorage.getItem(PENDING_USERNAME_KEY) || "").trim();

      const body: { displayName: string; username?: string } = {
        displayName: displayName || "New user",
        ...(username ? { username } : {}),
      };

      let obRes: Response;
      try {
        obRes = await authedFetch("/api/v1/onboarding", {
          method: "POST",
          body: JSON.stringify(body),
        });
      } catch (e) {
        throw new Error(friendlyFetchError(e));
      }

      if (!obRes.ok) {
        const text = await obRes.text().catch(() => "");
        throw new Error(`POST /api/v1/onboarding failed (${obRes.status}) ${text}`);
      }

      const created = await obRes.json();
      if (created?.cognitoSub) localStorage.setItem(ONBOARDED_KEY, created.cognitoSub);

      // onboarding completed, clear pending values
      localStorage.removeItem(PENDING_DISPLAY_NAME_KEY);
      localStorage.removeItem(PENDING_USERNAME_KEY);
      return;
    }

    // anything else is a real problem
    const text = await meRes.text().catch(() => "");
    throw new Error(`GET /api/v1/me failed (${meRes.status}) ${text}`);
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

      //run onboarding right after sign-in
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
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center gap-3">
            <img
              src="/stacta.png"
              alt="Stacta"
              className="h-12 w-12 select-none object-contain"
              draggable={false}
            />

            <div className="leading-tight">
              <div className="text-sm font-semibold">Stacta</div>
              <div className="text-xs text-white/60">Welcome back</div>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-xs font-medium text-white/70">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/20"
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
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/20"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <Button className="h-11 w-full rounded-xl" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="pt-2 text-center text-sm text-white/60">
                New here?{" "}
                <Link to="/sign-up" className="font-semibold text-white/80 hover:text-white">
                  Create an account
                </Link>
              </div>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-neutral-950/35 p-4">
              <div className="text-xs font-semibold text-white/70">Coming next</div>
              <div className="mt-1 text-xs text-white/60">
                Social discovery, Top 3 drops, and note art that makes profiles instantly readable.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-white/50">
            By signing in, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}
