// apps/web/src/pages/Auth/SignUp.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authSignUp } from "@/lib/auth";
import { UsernameCheckError, checkUsernameAvailable } from "@/lib/api/usernames";

const PENDING_DISPLAY_NAME_KEY = "stacta:pendingDisplayName";
const PENDING_USERNAME_KEY = "stacta:pendingUsername";

// normalize username: lowercase, keep letters/numbers/underscore, max 20
function normalizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
}

function isValidUsername(u: string) {
  // 3-20 chars, starts with letter/number, only letters/numbers/underscore
  return /^[a-z0-9][a-z0-9_]{2,19}$/.test(u);
}

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

export default function SignUpPage() {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [usernameRaw, setUsernameRaw] = useState("");
  const username = useMemo(() => normalizeUsername(usernameRaw), [usernameRaw]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // username availability UX
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameHelp, setUsernameHelp] = useState<string>("3–20 chars. Letters, numbers, underscore.");

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  // avoid stale pending values from previous attempts
  useEffect(() => {
    localStorage.removeItem(PENDING_DISPLAY_NAME_KEY);
    localStorage.removeItem(PENDING_USERNAME_KEY);
  }, []);

  // debounce + check availability when username changes
  useEffect(() => {
    // clear any pending debounce
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    // cancel in-flight request
    if (abortRef.current) abortRef.current.abort();

    // If user hasn't typed anything
    if (!usernameRaw.trim()) {
      setUsernameStatus("idle");
      setUsernameHelp("3–20 chars. Letters, numbers, underscore.");
      return;
    }

    // If after normalization it's empty or invalid, don't call backend
    if (!username || !isValidUsername(username)) {
      setUsernameStatus("invalid");
      setUsernameHelp(
        username
          ? "Username is invalid. Use 3–20 chars: letters/numbers/underscore."
          : "Username is required."
      );
      return;
    }

    // Debounce the API call
    setUsernameStatus("checking");
    setUsernameHelp("Checking availability…");

    debounceRef.current = window.setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const data = await checkUsernameAvailable(username, ctrl.signal);

        if (data.available) {
          setUsernameStatus("available");
          setUsernameHelp(`✅ @${data.normalized} is available`);
        } else {
          setUsernameStatus("taken");
          setUsernameHelp(`❌ @${data.normalized} is taken`);
        }
      } catch (e: any) {
        // ignore aborts (user kept typing)
        if (e?.name === "AbortError") return;

        if (e instanceof UsernameCheckError && e.status === 400) {
          setUsernameStatus("invalid");
          setUsernameHelp("Username is invalid. Use 3–20 chars: letters/numbers/underscore.");
          return;
        }

        setUsernameStatus("error");
        setUsernameHelp("Couldn’t check username. Is the backend running and VITE_API_URL correct?");
      }
    }, 450);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [usernameRaw, username]);

  const canSubmitUsername =
    username &&
    isValidUsername(username) &&
    usernameStatus !== "checking" &&
    usernameStatus !== "taken" &&
    usernameStatus !== "invalid" &&
    usernameStatus !== "error";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const dn = displayName.trim();
    const un = normalizeUsername(usernameRaw);
    const em = email.trim();

    if (!dn) {
      setError("Display name is required.");
      return;
    }

    if (!un) {
      setError("Username is required.");
      return;
    }

    if (!isValidUsername(un)) {
      setError("Username must be 3–20 characters and use only letters, numbers, or underscores.");
      return;
    }

    // block submit if we know it's taken/invalid or still checking
    if (!canSubmitUsername) {
      if (usernameStatus === "checking") setError("Hold up — still checking that username.");
      else if (usernameStatus === "taken") setError("That username is taken. Pick another one.");
      else setError("Fix your username before continuing.");
      return;
    }

    if (!em || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      await authSignUp(em, password);

      // Save for backend onboarding after login
      localStorage.setItem(PENDING_DISPLAY_NAME_KEY, dn);
      localStorage.setItem(PENDING_USERNAME_KEY, un);

      navigate(`/confirm?email=${encodeURIComponent(em)}`);
    } catch (err: any) {
      const name = err?.name || err?.code;
      const msg = err?.message || "Sign up failed.";

      if (name === "UsernameExistsException") {
        // This can mean: account exists OR they signed up but never confirmed
        setError(
          "That email already started signup. Try signing in, or confirm your account from the code email."
        );
        // optional: navigate(`/confirm?email=${encodeURIComponent(em)}`);
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

          <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-white/65">
            Build a fragrance profile, set your Top 3, and connect with people who share your taste.
          </p>

          <div className="mt-5 rounded-3xl border border-white/15 bg-black/30 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-xs font-medium text-white/70">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  type="text"
                  autoComplete="nickname"
                  placeholder="John Doe"
                  className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-amber-200/35"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/70">Username</label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                    @
                  </span>
                  <input
                    value={usernameRaw}
                    onChange={(e) => setUsernameRaw(e.target.value)}
                    type="text"
                    autoComplete="username"
                    placeholder="stacta"
                    className="h-11 w-full rounded-xl border border-white/15 bg-black/30 pl-7 pr-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-amber-200/35"
                  />
                </div>

                <div className="mt-2 text-xs text-white/50">
                  {usernameHelp}
                  {usernameStatus === "checking" && (
                    <span className="ml-2 inline-block animate-pulse text-white/40">…</span>
                  )}
                </div>
              </div>

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
                <label className="text-xs font-medium text-white/70">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white placeholder:text-white/30 outline-none ring-0 focus:border-amber-200/35"
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

              <Button className="h-11 w-full rounded-xl bg-white text-black hover:bg-white/90" disabled={loading || !canSubmitUsername}>
                {loading ? "Creating..." : "Create account"}
              </Button>

              <div className="pt-2 text-center text-sm text-white/60">
                Already have an account?{" "}
                <Link to="/sign-in" className="font-semibold text-white/80 hover:text-white">
                  Sign in
                </Link>
              </div>
            </form>
          </div>

          <div className="mt-6 text-center text-xs text-white/50">
            By creating an account, you agree to our Terms and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}
