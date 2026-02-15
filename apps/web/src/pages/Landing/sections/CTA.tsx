// apps/web/src/pages/Landing/sections/CTA.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "../components/ui";

export default function CTA() {
  return (
    <section className="pb-14">
      <GlassCard className="relative overflow-hidden p-6 md:p-10">
        <div className="pointer-events-none absolute -left-16 top-0 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-0 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="relative">
            <div className="text-2xl font-semibold md:text-3xl">Build a profile worth sharing.</div>
            <div className="mt-2 max-w-xl text-white/72">
              If you’re tired of messy notes and meaningless stars, you’re gonna love Stacta.
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-xl bg-[linear-gradient(90deg,#22d3ee,#6366f1)] px-6 text-black hover:opacity-95">
              <Link to="/sign-up">Join</Link>
            </Button>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
