// apps/web/src/pages/Auth/SignUp.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authSignUp } from "@/lib/auth";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await authSignUp(email.trim(), password);

      // NOTE: We’re not storing displayName in Cognito right now.
      // Save it after login in your backend profile endpoint.
      navigate(`/confirm?email=${encodeURIComponent(email.trim())}`);
    } catch (err: any) {
      const name = err?.name || err?.code;
      const msg = err?.message || "Sign up failed.";

      if (name === "UsernameExistsException") {
        setError("An account with that email already exists.");
      } else if (name === "InvalidPasswordException") {
        setError("Password doesn’t meet the requirements.");
      } else if (name === "InvalidParameterException") {
        setError("Check your email format and try again.");
      } else {
        setError(msg);
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
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
                <span className="text-sm font-semibold">S</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Stacta</div>
                <div className="text-xs text-white/60">Create your profile</div>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
              Sign up
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Build a shareable collection, drop honest reviews, and discover through taste.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-xs font-medium text-white/70">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  type="text"
                  autoComplete="nickname"
                  placeholder="Eddie"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/20"
                />
              </div>

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
                <label className="text-xs font-medium text-white/70">
                  Password
                </label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/20"
                />
                <div className="mt-2 text-xs text-white/50">
                  Use a strong password (uppercase, lowercase, number, symbol).
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <Button className="h-11 w-full rounded-xl" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </Button>

              <div className="pt-2 text-center text-sm text-white/60">
                Already have an account?{" "}
                <Link
                  to="/sign-in"
                  className="font-semibold text-white/80 hover:text-white"
                >
                  Sign in
                </Link>
              </div>
            </form>

            <div className="mt-6 rounded-2xl border border-white/10 bg-neutral-950/35 p-4">
              <div className="text-xs font-semibold text-white/70">
                Why Stacta?
              </div>
              <div className="mt-1 text-xs text-white/60">
                Profiles are built for sharing: collection + wishlist, consistent ratings, and visual notes that make taste instantly legible.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-white/50">
            By creating an account, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}
