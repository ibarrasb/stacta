// apps/web/src/pages/Landing/sections/Features.tsx
import { landingCopy } from "../landing.data";
import { GlassCard, Pill } from "../components/ui";

export default function Features() {
  return (
    <section className="py-12">
      <div className="grid gap-5 md:grid-cols-[1fr_1fr] md:items-start">
        <GlassCard className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60">What we are</div>
          <div className="mt-2 text-2xl font-semibold md:text-3xl">
            A fragrance profile that actually explains you.
          </div>
          <p className="mt-3 text-sm text-white/72 md:text-base">
            Most apps stop at “owned” and a star rating. Stacta is built around taste: the scents you wear, how they
            perform, and how your preferences evolve over time.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill>Collection + wishlist</Pill>
            <Pill>Reviews with structure</Pill>
            <Pill>Top 3 drops</Pill>
            <Pill>Share-ready cards</Pill>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/60">Why different</div>
          <div className="mt-2 space-y-3">
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
    <div className="rounded-2xl border border-white/12 bg-white/6 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/72">{desc}</div>
    </div>
  );
}
