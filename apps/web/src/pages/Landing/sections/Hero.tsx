// apps/web/src/pages/Landing/sections/Hero.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FRAGRANCES, type Fragrance, type NoteItem, landingCopy } from "../landing.data";
import {
  GlassCard,
  Pill,
  SmartImage,
  NoteBadge,
  cx,
  ratingText,
} from "../components/ui";

function getDemoFragrance(preferredIndex: number): Fragrance | null {
  if (!Array.isArray(FRAGRANCES) || FRAGRANCES.length === 0) return null;
  return FRAGRANCES[preferredIndex] ?? FRAGRANCES[0] ?? null;
}

export default function Hero() {
  const [open, setOpen] = useState<Fragrance | null>(null);
  const featured = getDemoFragrance(0);
  const boardReview = getDemoFragrance(2) ?? featured;

  const noteStrip = useMemo(() => {
    if (!Array.isArray(FRAGRANCES) || FRAGRANCES.length === 0) return [];

    const notes: NoteItem[] = [];
    for (const f of FRAGRANCES) {
      (f?.notes?.Top ?? []).forEach((n) => n && notes.push(n));
      (f?.notes?.Middle ?? []).forEach((n) => n && notes.push(n));
      (f?.notes?.Base ?? []).forEach((n) => n && notes.push(n));
    }

    const seen = new Set<string>();
    const unique: NoteItem[] = [];
    for (const n of notes) {
      const key = n.imageUrl || n.name;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(n);
    }

    return unique.slice(0, 14);
  }, []);

  return (
    <>
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-cyan-300/10 bg-[#07070b]/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/stacta.png"
              alt="Stacta"
              className="h-12 w-12 select-none object-contain md:h-14 md:w-14"
              draggable={false}
            />
            <div className="min-w-0 leading-tight">
              <div className="text-sm font-semibold">Stacta</div>
              <div className="truncate text-xs text-white/60">Taste-first fragrance discovery.</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              variant="secondary"
              className="hidden h-11 rounded-xl border border-white/12 bg-white/10 px-4 text-white hover:bg-white/15 md:inline-flex"
            >
              <Link to="/sign-in">Sign in</Link>
            </Button>

            <Button asChild className="h-11 rounded-xl px-4">
              <Link to="/sign-up">Join</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4">
        {/* HERO */}
        <section className="pt-10 md:pt-14">
          <div className="grid gap-6 md:gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {(landingCopy?.pills ?? ["Log fast", "Structured reviews", "Top 3", "Note art"]).map((p) => (
                  <Pill key={p}>{p}</Pill>
                ))}
              </div>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
                Your taste,{" "}
                <span className="bg-[linear-gradient(90deg,rgba(34,211,238,1),rgba(244,114,182,1),rgba(99,102,241,1))] bg-clip-text text-transparent">
                  made visible
                </span>
                .
              </h1>

              <p className="mt-4 max-w-xl text-base text-white/72 md:text-lg">
                Stacta is a social fragrance log where{" "}
                <span className="text-white">reviews stay consistent</span>,{" "}
                <span className="text-white">notes are visual</span>, and discovery comes from people whose taste you
                actually trust.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 rounded-xl px-6">
                  <Link to="/sign-up">Join</Link>
                </Button>

                <Button
                  variant="secondary"
                  className="h-11 rounded-xl border border-white/12 bg-white/10 px-6 text-white hover:bg-white/15"
                  onClick={() => featured && setOpen(featured)}
                >
                  See the board
                </Button>
              </div>

              <ScentRibbon />

              {/* WHY DIFFERENT */}
              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <WhyCard
                  title={(landingCopy?.why?.[0]?.title ?? "Consistency")}
                  desc={(landingCopy?.why?.[0]?.desc ?? "Structured ratings so reviews are comparable — not random essays.")}
                  accent="from-cyan-400/40"
                />
                <WhyCard
                  title={(landingCopy?.why?.[1]?.title ?? "Visual notes")}
                  desc={(landingCopy?.why?.[1]?.desc ?? "Note art makes scents easier to remember and faster to scan.")}
                  accent="from-pink-400/40"
                />
                <WhyCard
                  title={(landingCopy?.why?.[2]?.title ?? "Taste graphs")}
                  desc={(landingCopy?.why?.[2]?.desc ?? "See patterns in what you like — then discover smarter.")}
                  accent="from-indigo-400/40"
                />
              </div>
            </div>

            <GlassCard className="relative min-w-0 overflow-hidden p-4 md:p-5">
              <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-cyan-400/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-14 -left-12 h-40 w-40 rounded-full bg-pink-400/12 blur-2xl" />

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Taste Board</div>
                  <div className="text-xs text-white/60">A profile system, not a template feed.</div>
                </div>
                <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-100/85">
                  live preview
                </div>
              </div>

              <div className="mt-4 min-w-0">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Metric label="collection" value="24" />
                  <Metric label="reviews" value="11" />
                  <Metric label="taste score" value="A-" />
                </div>

                {featured ? (
                  <button
                    onClick={() => setOpen(featured)}
                    className="mt-3 grid w-full grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border border-white/12 bg-white/6 p-3 text-left transition hover:bg-white/10"
                  >
                    <SmartImage
                      src={featured.imageUrl}
                      fallbacks={featured.imageFallbacks}
                      alt={`${featured.brand} ${featured.name}`}
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{featured.name}</div>
                      <div className="truncate text-xs text-white/60">{featured.brand}</div>
                    </div>
                    <div className="rounded-full bg-cyan-400/15 px-2 py-1 text-xs text-cyan-100">
                      {ratingText(featured.rating)}
                    </div>
                  </button>
                ) : null}

                <div className="mt-3 rounded-2xl border border-white/12 bg-white/6 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Structured review</div>
                      <div className="text-xs text-white/60">Comparable, not vibes-only.</div>
                    </div>
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs text-white/80">
                      @eddie
                    </span>
                  </div>

                  {boardReview ? (
                    <div className="mt-3 text-sm text-white/75">
                      <span className="font-semibold text-white">{boardReview.brand} {boardReview.name}</span>
                      {" "}is clean, smooth, and easy to wear. Great in rotation, less great for uniqueness.
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 rounded-2xl border border-white/12 bg-white/6 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Note pulse</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {noteStrip.length ? noteStrip.slice(0, 8).map((n) => <NoteBadge key={n.imageUrl || n.name} note={n} />) : (
                      <div className="text-sm text-white/70">Add fragrances with notes to preview this section.</div>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>
      </div>

      {open && <FragranceModal fragrance={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/6 p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/55">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function RibbonChip({
  text,
  tone,
}: {
  text: string;
  tone: "cyan" | "pink" | "indigo";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100"
      : tone === "pink"
        ? "border-pink-300/30 bg-pink-300/12 text-pink-100"
        : "border-indigo-300/30 bg-indigo-300/12 text-indigo-100";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-[0_0_18px_rgba(255,255,255,0.06)]",
        toneClass
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {text}
    </span>
  );
}

function ScentRibbon() {
  const laneA = [
    "Log fast",
    "Structured reviews",
    "Top 3",
    "Note art",
    "Taste graphs",
    "Community adds",
  ];
  const laneB = [
    "Fresh",
    "Woody",
    "Amber",
    "Citrus",
    "Night out",
    "Signature",
    "Daily wear",
  ];

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-white/12 bg-[#090912]/85">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="text-xs uppercase tracking-[0.2em] text-white/65">Scent Ribbon</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/70">live flow</div>
      </div>

      <div className="relative overflow-hidden py-2.5">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-[linear-gradient(90deg,rgba(9,9,18,1),rgba(9,9,18,0))]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-[linear-gradient(270deg,rgba(9,9,18,1),rgba(9,9,18,0))]" />

        <div className="stacta-marquee flex min-w-max items-center gap-2 px-3">
          {laneA.map((item, i) => (
            <RibbonChip key={`${item}-${i}`} text={item} tone={i % 3 === 0 ? "cyan" : i % 3 === 1 ? "pink" : "indigo"} />
          ))}
          {laneA.map((item, i) => (
            <RibbonChip key={`${item}-loop-${i}`} text={item} tone={i % 3 === 0 ? "cyan" : i % 3 === 1 ? "pink" : "indigo"} />
          ))}
        </div>

        <div
          className="stacta-marquee mt-2 flex min-w-max items-center gap-2 px-3"
          style={{ animationDirection: "reverse", animationDuration: "24s" }}
        >
          {laneB.map((item, i) => (
            <RibbonChip key={`${item}-${i}`} text={item} tone={i % 3 === 0 ? "indigo" : i % 3 === 1 ? "cyan" : "pink"} />
          ))}
          {laneB.map((item, i) => (
            <RibbonChip key={`${item}-loop-${i}`} text={item} tone={i % 3 === 0 ? "indigo" : i % 3 === 1 ? "cyan" : "pink"} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WhyCard({
  title,
  desc,
  accent,
}: {
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/6 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-white/10">
      <div className={cx("absolute inset-0 opacity-[0.45] bg-gradient-to-br", accent, "to-transparent")} />
      <div className="relative">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-white/72">{desc}</div>
      </div>
    </div>
  );
}

function FragranceModal({ fragrance, onClose }: { fragrance: Fragrance; onClose: () => void }) {
  const accords = (fragrance.mainAccords ?? []).slice(0, 6);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/12 bg-[#0b0b12] p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <SmartImage
              src={fragrance.imageUrl}
              fallbacks={fragrance.imageFallbacks}
              alt={`${fragrance.brand} ${fragrance.name}`}
              className="h-14 w-14 rounded-2xl object-cover"
            />
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold">{fragrance.name}</div>
              <div className="truncate text-sm text-white/60">{fragrance.brand}</div>
              <div className="mt-1 text-xs text-white/60">
                {fragrance.longevity ?? "—"} • {fragrance.sillage ?? "—"} • {ratingText(fragrance.rating)}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-11 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {accords.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {accords.map((a) => (
              <span
                key={a}
                className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/12 bg-white/6 p-4 text-sm text-white/72">
          Demo modal — later this is the full fragrance page (notes clusters, reviews, collection status).
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 rounded-xl px-6">Add to collection</Button>
          <Button
            variant="secondary"
            className="h-11 rounded-xl border border-white/12 bg-white/10 px-6 text-white hover:bg-white/15"
          >
            Write a review
          </Button>
        </div>
      </div>
    </div>
  );
}
