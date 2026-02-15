// apps/web/src/pages/Landing/sections/HowItWorks.tsx
import { landingCopy } from "../landing.data";
import { GlassCard } from "../components/ui";

export default function HowItWorks() {
  return (
    <section className="pb-14">
      <GlassCard className="p-6 md:p-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-100/80">How it works</div>
            <div className="mt-2 text-2xl font-semibold md:text-3xl">Three steps to make taste readable.</div>
            <div className="mt-2 max-w-2xl text-sm text-white/72 md:text-base">
              Log what you wear, review with a consistent rubric, and discover through people whose taste matches yours.
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
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
    <div className="relative rounded-2xl border border-white/12 bg-white/6 p-5 transition duration-300 hover:-translate-y-0.5 hover:border-indigo-200/35">
      <div className="absolute left-8 top-10 hidden h-12 w-px bg-[linear-gradient(to_bottom,rgba(255,255,255,0.45),rgba(255,255,255,0.08))] md:block" />
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full border border-cyan-300/35 bg-cyan-300/15 text-xs font-semibold text-cyan-100">
          {n}
        </span>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="mt-2 text-sm text-white/72">{desc}</div>
    </div>
  );
}
