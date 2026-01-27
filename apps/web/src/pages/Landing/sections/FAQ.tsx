// apps/web/src/pages/Landing/sections/FAQ.tsx
import { useState } from "react";
import { landingCopy } from "../landing.data";
import { GlassCard, cx } from "../components/ui";

export default function FAQ() {
  return (
    <section className="pb-12">
      <GlassCard className="p-6 md:p-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/60">FAQ</div>
        <div className="mt-2 text-2xl font-semibold md:text-3xl">Quick answers.</div>
        <div className="mt-6 space-y-2">
          {landingCopy.faqs.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </GlassCard>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full rounded-2xl border border-white/12 bg-white/6 p-4 text-left hover:bg-white/10"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{q}</div>
        <span
          className={cx(
            "grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-white/8 text-xs text-white/70 transition",
            open && "rotate-45"
          )}
        >
          +
        </span>
      </div>
      {open && <div className="mt-2 text-sm text-white/72">{a}</div>}
    </button>
  );
}
