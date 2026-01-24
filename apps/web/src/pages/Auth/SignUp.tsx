// apps/web/src/pages/Auth/SignUp.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
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
            <form className="space-y-4">
              <div>
                <label className="text-xs font-medium text-white/70">
                  Display name
                </label>
                <input
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
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/20"
                />
                <div className="mt-2 text-xs text-white/50">
                  Use a strong password (uppercase, lowercase, number, symbol).
                </div>
              </div>

              <Button className="h-11 w-full rounded-xl">Create account</Button>

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
