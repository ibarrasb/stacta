import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authConfirmSignUp, authResendSignUpCode } from "@/lib/auth";

export default function ConfirmSignUpPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const emailFromQuery = useMemo(() => params.get("email") || "", [params]);
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !code.trim()) {
      setError("Enter your email and the confirmation code.");
      return;
    }

    setLoading(true);
    try {
      await authConfirmSignUp(email.trim(), code.trim());
      setMessage("Confirmed. You can sign in now.");
      navigate("/sign-in");
    } catch (err: any) {
      const name = err?.name || err?.code;
      const msg = err?.message || "Confirmation failed.";

      if (name === "CodeMismatchException") {
        setError("That code is incorrect.");
      } else if (name === "ExpiredCodeException") {
        setError("That code expired. Resend a new one.");
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

    setResending(true);
    try {
      await authResendSignUpCode(email.trim());
      setMessage("New code sent. Check your email.");
    } catch (err: any) {
      const name = err?.name || err?.code;
      const msg = err?.message || "Could not resend code.";

      if (name === "LimitExceededException" || name === "TooManyRequestsException") {
        setError("Too many requests. Try again in a bit.");
      } else if (name === "UserNotFoundException") {
        setError("No account found with that email.");
      } else {
        setError(msg);
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Confirm your account</h1>
            <p className="mt-2 text-sm text-white/70">
              We emailed you a code. Enter it below to finish creating your account.
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

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-xs font-medium text-white/70">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/70">Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-neutral-950/40 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-white/20"
              />
            </div>

            <Button className="h-11 w-full rounded-xl" disabled={loading}>
              {loading ? "Confirming..." : "Confirm account"}
            </Button>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={onResend}
                disabled={resending || loading}
                className="text-sm text-white/70 hover:text-white hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resending ? "Sending new code..." : "Resend code"}
              </button>
            </div>
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
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
