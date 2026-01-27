// apps/web/src/pages/Landing/sections/CTA.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlassCard } from "../components/ui";

export default function CTA() {
  return (
    <section className="pb-14">
      <GlassCard className="p-6 md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-semibold md:text-3xl">Build a profile worth sharing.</div>
            <div className="mt-2 max-w-xl text-white/72">
              If you’re tired of messy notes and meaningless stars, you’re gonna love Stacta.
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-xl px-6">
              <Link to="/sign-up">Join</Link>
            </Button>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
