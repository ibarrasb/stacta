// apps/web/src/pages/Auth/SignIn.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authSignIn } from "@/lib/auth";

export default function SignInPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  
      navigate("/");
    } catch (err: any) {
      // Common Cognito errors
      const name = err?.name || err?.code;
      const msg = err?.message || "Sign in failed.";

      if (name === "UserNotConfirmedException") {
        // user exists but hasn’t confirmed email yet
        navigate(`/confirm?email=${encodeURIComponent(email.trim())}`);
        return;
      }

      if (name === "NotAuthorizedException") {
        setError("Wrong email or password.");
      } else if (name === "UserNotFoundException") {
        setError("No account found with that email.");
      } else if (name === "TooManyRequestsException") {
        setError("Too many attempts. Try again in a bit.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
                <span className="text-sm font-semibold">S</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Stacta</div>
                <div className="text-xs text-white/60">Welcome back</div>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Pick up where you left off — your collection, reviews, and discoveries are waiting.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-xs font-medium text-white/70">
                  Email
                </label>
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
                  <label className="text-xs font-medium text-white/70">
                    Password
                  </label>

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
                <Link
                  to="/sign-up"
                  className="font-semibold text-white/80 hover:text-white"
                >
                  Create an account
                </Link>
              </div>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-neutral-950/35 p-4">
              <div className="text-xs font-semibold text-white/70">
                Coming next
              </div>
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
