// apps/web/src/pages/Landing/sections/CTA.tsx
import { GlassCard } from "../components/ui";

export default function CTA() {
  return (
    <section>
      <GlassCard className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="flex items-start gap-3">
          <img
            src="/stacta.png"
            alt="Stacta"
            className="h-11 w-11 rounded-xl border border-white/15 bg-black/25 object-contain p-1.5"
            draggable={false}
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/85">Launchpad</div>
            <div className="mt-1 text-xl font-semibold leading-tight">Start building your fragrance identity.</div>
          </div>
        </div>

        <p className="mt-3 text-sm text-white/72">
          Create your account, set your Top 3, and start discovering through the community feed.
        </p>
      </GlassCard>
    </section>
  );
}
