// apps/web/src/pages/Landing/sections/Features.tsx
import { landingCopy } from "../landing.data";
import { GlassCard, Pill } from "../components/ui";

export default function Features() {
  return (
    <section className="py-14">
      <div className="mb-5">
        <div className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/90">
          What Stacta Is
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-start">
        <GlassCard className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60">Fragrance identity layer</div>
          <div className="mt-2 text-2xl font-semibold md:text-3xl">
            A fragrance profile that actually explains you.
          </div>
          <p className="mt-3 text-sm text-white/72 md:text-base">
            Most apps stop at “owned” and a star rating. Stacta is built around taste: the scents you wear, how they
            perform, and how your preferences evolve over time.
          </p>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <Pill>Collection + wishlist</Pill>
            <Pill>Reviews with structure</Pill>
            <Pill>Top 3 drops</Pill>
            <Pill>Share-ready cards</Pill>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60">Why different</div>
          <div className="mt-3 space-y-3">
            {landingCopy.diffs.map((d) => (
              <DiffRow key={d.title} title={d.title} desc={d.desc} />
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

function DiffRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 transition duration-300 hover:border-pink-200/30">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-white/72">{desc}</div>
    </div>
  );
}
