import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="mt-2 text-sm text-white/70">
              Enter your email and we’ll send you a reset link or code.
            </p>
          </div>

          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>

            <Button className="h-11 w-full rounded-xl">Send reset</Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              to="/sign-in"
              className="text-white/70 hover:text-white underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
            <Link
              to="/sign-up"
              className="text-white/70 hover:text-white underline-offset-4 hover:underline"
            >
              Create account
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-neutral-950/35 p-3 text-xs text-white/60">
            Later: wire this to Cognito’s forgot password flow.
          </div>
        </div>
      </div>
    </div>
  );
}
