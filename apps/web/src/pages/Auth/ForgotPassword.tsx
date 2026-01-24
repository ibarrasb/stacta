// apps/web/src/pages/Auth/ForgotPassword.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authForgotPassword, authConfirmForgotPassword } from "@/lib/auth";

const RESEND_COOLDOWN_SECONDS = 180;
const RESEND_STORAGE_KEY = "stacta:forgotPassword:resendAvailableAt";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "confirm">("request");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // cooldown (persisted)
  const [cooldown, setCooldown] = useState(0);

  function nowMs() {
    return Date.now();
  }

  function getAvailableAtMs(): number | null {
    const raw = localStorage.getItem(RESEND_STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }

  function setAvailableAtMs(ms: number) {
    localStorage.setItem(RESEND_STORAGE_KEY, String(ms));
  }

  function clearAvailableAtMs() {
    localStorage.removeItem(RESEND_STORAGE_KEY);
  }

  function computeCooldownFromStorage(): number {
    const availableAt = getAvailableAtMs();
    if (!availableAt) return 0;
    const diffSeconds = Math.ceil((availableAt - nowMs()) / 1000);
    return diffSeconds > 0 ? diffSeconds : 0;
  }

  function startCooldown() {
    const availableAt = nowMs() + RESEND_COOLDOWN_SECONDS * 1000;
    setAvailableAtMs(availableAt);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  // If we land on confirm step (or refresh while there), restore cooldown from storage
  useEffect(() => {
    const current = computeCooldownFromStorage();
    if (current > 0) setCooldown(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick down once per second, staying in sync with localStorage
  useEffect(() => {
    if (cooldown <= 0) return;

    const id = window.setInterval(() => {
      const current = computeCooldownFromStorage();
      setCooldown(current);

      if (current <= 0) {
        clearAvailableAtMs();
        window.clearInterval(id);
      }
    }, 1000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooldown]);

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
      startCooldown(); // start immediately after request
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

  async function onResend() {
    setError(null);
    setMessage(null);

    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }

    if (cooldown > 0) return;

    setLoading(true);
    try {
      await authForgotPassword(email.trim());
      setMessage("New code sent. Check your email.");
      startCooldown();
    } catch (err: any) {
      const name = err?.name || err?.code;
      const msg = err?.message || "Could not resend code.";

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
      clearAvailableAtMs(); // optional: clear cooldown once complete
      setCooldown(0);
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
    <div className="min-h-screen text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold">Reset your password</h1>
              <p className="mt-2 text-sm text-white/70">
                {step === "request"
                  ? "Enter your email and we’ll send you a reset code."
                  : "Enter the code from your email and set a new password."}
              </p>

              {step === "confirm" && (
                <p className="mt-2 text-xs text-white/50">
                  Codes may take a few minutes to arrive. If you don’t see it, check spam/promotions.
                </p>
              )}
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
                    className="h-11 rounded-xl border-white/10 bg-neutral-950/40 text-white placeholder:text-white/40"
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
                    className="h-11 rounded-xl border-white/10 bg-neutral-950/40 text-white placeholder:text-white/40"
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
                    className="h-11 rounded-xl border-white/10 bg-neutral-950/40 text-white placeholder:text-white/40"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 flex-1 rounded-xl"
                    onClick={() => setStep("request")}
                    disabled={loading}
                  >
                    Back
                  </Button>

                  <Button className="h-11 flex-1 rounded-xl" disabled={loading}>
                    {loading ? "Updating..." : "Update password"}
                  </Button>
                </div>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={loading || cooldown > 0}
                    className="text-sm text-white/70 hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                  </button>
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
    </div>
  );
}
