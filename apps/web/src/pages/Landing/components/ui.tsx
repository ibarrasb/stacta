// apps/web/src/pages/Landing/components/ui.tsx
import { useMemo, useState } from "react";

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export function ratingText(r?: string) {
  if (!r) return "—";
  const n = Number(r);
  return Number.isNaN(n) ? r : n.toFixed(2);
}

export function SmartImage({
  src,
  fallbacks,
  alt,
  className,
}: {
  src?: string;
  fallbacks?: string[];
  alt: string;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const urls = useMemo(() => {
    const list = [src, ...(fallbacks ?? [])].filter(Boolean) as string[];
    return list.length ? list : [];
  }, [src, fallbacks]);

  if (!urls.length) {
    return (
      <div className={cx("grid place-items-center bg-white/5 text-white/40", className)}>
        <span className="text-[11px]">no image</span>
      </div>
    );
  }

  return (
    <img
      src={urls[i]}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (i < urls.length - 1) setI(i + 1);
      }}
    />
  );
}

export function NoteBadge({
  note,
}: {
  note: { name: string; imageUrl?: string; fallbackUrls?: string[] };
}) {
  return (
    <div className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-2 hover:bg-white/12">
      <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white/6 ring-1 ring-white/10">
        <SmartImage
          src={note.imageUrl}
          fallbacks={note.fallbackUrls}
          alt={note.name}
          className="h-full w-full object-cover scale-[1.18] transition group-hover:scale-[1.24]"
        />
      </div>
      <div className="text-xs text-white/78">{note.name}</div>
    </div>
  );
}

/** Distinct background: brighter “ink + aurora” vibe */
export function AuraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* base */}
      <div className="absolute inset-0 bg-[#07070b]" />

      {/* ink clouds */}
      <div className="absolute -left-24 -top-28 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.22),transparent_55%)] blur-2xl" />
      <div className="absolute -right-28 top-20 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(244,114,182,0.18),transparent_55%)] blur-2xl" />
      <div className="absolute left-1/3 top-[55%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_40%_40%,rgba(99,102,241,0.20),transparent_58%)] blur-2xl" />

      {/* subtle vignette + lift */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(7,7,11,0.35),rgba(7,7,11,1))]" />

      {/* faint grid for depth */}
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:44px_44px]" />

      {/* noise */}
      <div className="absolute inset-0 opacity-[0.08] [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.22%22/%3E%3C/svg%3E')]" />
    </div>
  );
}

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-white/12 bg-white/6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75">
      {children}
    </span>
  );
}

export function PeekTabs({
  tab,
  setTab,
}: {
  tab: "taste" | "review" | "notes";
  setTab: (t: "taste" | "review" | "notes") => void;
}) {
  const btn = (id: typeof tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={cx(
        "min-h-11 rounded-full px-3 py-2 text-xs transition md:min-h-9 md:py-1.5",
        tab === id ? "bg-white/14 text-white" : "text-white/60 hover:bg-white/6 hover:text-white"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="grid w-full grid-cols-3 items-center gap-1 rounded-full border border-white/12 bg-white/6 p-1 sm:w-auto">
      {btn("taste", "Taste")}
      {btn("review", "Review")}
      {btn("notes", "Notes")}
    </div>
  );
}
