// apps/web/src/pages/Landing/sections/HowItWorks.tsx
import { landingCopy } from "../landing.data";
import { GlassCard } from "../components/ui";

export default function HowItWorks() {
  return (
    <section>
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/85">Flow</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">A clean path from signup to discovery.</h3>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/20 px-3 py-1.5 text-xs text-white/65">3-step loop</div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {landingCopy.steps.map((s, idx) => (
            <StepCard key={s.title} n={idx + 1} title={s.title} desc={s.desc} />
          ))}
        </div>
      </GlassCard>
    </section>
  );
}

function StepCard({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="relative rounded-2xl border border-white/15 bg-black/20 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/35">
      {n < 3 ? (
        <div className="pointer-events-none absolute right-[-8px] top-1/2 hidden h-px w-4 bg-white/30 md:block" />
      ) : null}
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full border border-amber-200/35 bg-amber-300/18 text-xs font-semibold text-amber-100">
          {n}
        </span>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="mt-2 text-sm text-white/72">{desc}</div>
    </div>
  );
}
