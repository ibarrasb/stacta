// apps/web/src/pages/NotFound.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5">
                <span className="text-sm font-semibold">S</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Stacta</div>
                <div className="text-xs text-white/60">404</div>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight">
              Page not found
            </h1>
            <p className="mt-2 text-sm text-white/70">
              That route doesn’t exist (or it moved). Try heading back home.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/">
                <Button className="h-11 rounded-xl px-6">Go to landing</Button>
              </Link>
              <Link to="/home">
                <Button
                  variant="secondary"
                  className="h-11 rounded-xl border border-white/12 bg-white/10 px-6 text-white hover:bg-white/15"
                >
                  Go to app
                </Button>
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-neutral-950/35 p-4">
              <div className="text-xs font-semibold text-white/70">Tip</div>
              <div className="mt-1 text-xs text-white/60">
                If you think this is a bug, double-check the URL or go back to the last page.
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-white/50">
            Error code: 404
          </div>
        </div>
      </div>
    </div>
  );
}
