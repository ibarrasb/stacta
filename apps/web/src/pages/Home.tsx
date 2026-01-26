// apps/web/src/pages/Home.tsx
import { Button } from "@/components/ui/button";
import { authSignOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

const ONBOARDED_KEY = "stacta:onboardedSub";

export default function HomePage() {
  const navigate = useNavigate();

  async function onSignOut() {
    try {
      localStorage.removeItem(ONBOARDED_KEY);
      await authSignOut();
    } finally {
      window.location.href = "/sign-in";
    }
  }

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
          <p className="mt-2 text-sm text-white/70">
            You’re signed in. This is a placeholder page so protected routes can redirect somewhere.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="h-11 rounded-xl px-6" onClick={() => navigate("/search")}>
              Go to search
            </Button>

            <Button
              variant="secondary"
              className="h-11 rounded-xl border border-white/12 bg-white/10 px-6 text-white hover:bg-white/15"
              onClick={() => navigate("/profile")}
            >
              My profile
            </Button>

            <Button
              variant="secondary"
              className="h-11 rounded-xl border border-white/12 bg-white/10 px-6 text-white hover:bg-white/15"
              onClick={onSignOut}
            >
              Sign out
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-neutral-950/35 p-4">
            <div className="text-xs font-semibold text-white/70">Next</div>
            <div className="mt-1 text-xs text-white/60">
              Wire this to your real app shell (nav + routes) once Collection/Reviews are ready.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
