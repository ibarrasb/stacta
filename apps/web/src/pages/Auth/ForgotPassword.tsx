// apps/web/src/pages/Auth/ForgotPassword.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authForgotPassword, authConfirmForgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "confirm">("request");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    setLoading(true);
    try {
      await authForgotPassword(email.trim());
      setStep("confirm");
      setMessage("We sent a reset code to your email.");
    } catch (err: any) {
      const name = err?.name || err?.code;
      const msg = err?.message || "Could not send reset code.";

      if (name === "UserNotFoundException") {
        setError("No account found with that email.");
      } else if (name === "LimitExceededException" || name === "TooManyRequestsException") {
        setError("Too many requests. Try again in a bit.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!code.trim() || !newPassword) {
      setError("Enter the code and your new password.");
      return;
    }

    setLoading(true);
    try {
      await authConfirmForgotPassword(email.trim(), code.trim(), newPassword);
      setMessage("Password updated. You can sign in now.");
    } catch (err: any) {
      const name = err?.name || err?.code;
      const msg = err?.message || "Could not reset password.";

      if (name === "CodeMismatchException") {
        setError("That code is incorrect.");
      } else if (name === "ExpiredCodeException") {
        setError("That code expired. Send a new one.");
      } else if (name === "InvalidPasswordException") {
        setError("Password doesn’t meet the requirements.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="mt-2 text-sm text-white/70">
              {step === "request"
                ? "Enter your email and we’ll send you a reset code."
                : "Enter the code from your email and set a new password."}
            </p>
          </div>

          {message && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {step === "request" ? (
            <form className="space-y-4" onSubmit={onRequest}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>

              <Button className="h-11 w-full rounded-xl" disabled={loading}>
                {loading ? "Sending..." : "Send reset"}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onConfirm}>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-white/80">
                  Reset code
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-white/80">
                  New password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-full rounded-xl"
                  onClick={() => setStep("request")}
                  disabled={loading}
                >
                  Back
                </Button>

                <Button className="h-11 w-full rounded-xl" disabled={loading}>
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          )}

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
        </div>
      </div>
    </div>
  );
}
