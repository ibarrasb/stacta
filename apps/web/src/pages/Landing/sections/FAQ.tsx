// apps/web/src/pages/Landing/sections/FAQ.tsx
import { useState } from "react";
import { landingCopy } from "../landing.data";
import { GlassCard, cx } from "../components/ui";

export default function FAQ() {
  return (
    <section>
      <GlassCard className="p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100/85">Questions</div>
        <div className="mt-2 text-xl font-semibold md:text-2xl">Fast answers while you browse.</div>
        <div className="mt-4 space-y-2">
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
      className="w-full rounded-2xl border border-white/15 bg-black/20 p-4 text-left transition duration-300 hover:border-amber-200/35 hover:bg-white/10"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{q}</div>
        <span
          className={cx(
            "grid h-7 w-7 place-items-center rounded-full border border-amber-200/30 bg-amber-300/15 text-xs text-amber-50 transition",
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
