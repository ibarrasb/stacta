// apps/web/src/pages/Landing/sections/Hero.tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FRAGRANCES, type Fragrance, type NoteItem, landingCopy } from "../landing.data";
import {
  GlassCard,
  PeekTabs,
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
  const [tab, setTab] = useState<"taste" | "review" | "notes">("taste");
  const [open, setOpen] = useState<Fragrance | null>(null);

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

    return unique.slice(0, 12);
  }, []);

  return (
    <>
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070b]/55 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/stacta.png"
              alt="Stacta"
              className="h-15 w-15 select-none object-contain"
              draggable={false}
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Stacta</div>
              <div className="text-xs text-white/60">Taste-first fragrance discovery.</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="secondary"
              className="hidden h-9 rounded-xl border border-white/12 bg-white/10 px-4 text-white hover:bg-white/15 md:inline-flex"
            >
              <Link to="/sign-in">Sign in</Link>
            </Button>

            <Button asChild className="h-9 rounded-xl px-4">
              <Link to="/sign-up">Join</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4">
        {/* HERO */}
        <section className="pt-10 md:pt-14">
          <div className="grid gap-8 md:grid-cols-[1.08fr_0.92fr] md:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                {(landingCopy?.pills ?? ["Log fast", "Structured reviews", "Top 3", "Note art"]).map((p) => (
                  <Pill key={p}>{p}</Pill>
                ))}
              </div>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
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
                  onClick={() => setTab("review")}
                >
                  See a quick peek
                </Button>
              </div>

              {/* WHY DIFFERENT */}
              <div className="mt-8 grid gap-3 md:grid-cols-3">
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

            {/* PEEK PANEL */}
            <GlassCard className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">A quick peek</div>
                  <div className="text-xs text-white/60">Three screenshots worth of clarity.</div>
                </div>
                <PeekTabs tab={tab} setTab={setTab} />
              </div>

              <div className="mt-4">
                {tab === "taste" && <PeekTaste onOpen={setOpen} />}
                {tab === "review" && <PeekReview onOpen={setOpen} />}
                {tab === "notes" && <PeekNotes notes={noteStrip} />}
              </div>
            </GlassCard>
          </div>
        </section>
      </div>

      {open && <FragranceModal fragrance={open} onClose={() => setOpen(null)} />}
    </>
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
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/6 p-4">
      <div className={cx("absolute inset-0 opacity-[0.45] bg-gradient-to-br", accent, "to-transparent")} />
      <div className="relative">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-white/72">{desc}</div>
      </div>
    </div>
  );
}

function PeekTaste({ onOpen }: { onOpen: (f: Fragrance) => void }) {
  const f = getDemoFragrance(1);

  if (!f) {
    return (
      <div className="rounded-2xl border border-white/12 bg-[#0b0b12]/55 p-4">
        <div className="text-sm font-semibold">Taste snapshot</div>
        <div className="mt-2 text-sm text-white/70">
          Add at least 1 fragrance in <code className="text-white/80">landing.data.ts</code> to show the demo.
        </div>
      </div>
    );
  }

  const tags = ["citrus-forward", "clean", "dressy", "expensive vibe"];

  return (
    <div className="rounded-2xl border border-white/12 bg-[#0b0b12]/55 p-4">
      <div className="text-sm font-semibold">Taste snapshot</div>

      <div className="mt-3 flex items-center gap-3">
        <SmartImage
          src={f.imageUrl}
          fallbacks={f.imageFallbacks}
          alt={`${f.brand} ${f.name}`}
          className="h-12 w-12 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{f.name}</div>
          <div className="truncate text-xs text-white/60">{f.brand}</div>
          <div className="mt-1 text-xs text-white/60">
            {f.longevity ?? "—"} • {f.sillage ?? "—"} • {ratingText(f.rating)}
          </div>
        </div>

        <Button
          variant="secondary"
          className="h-9 rounded-xl border border-white/12 bg-white/10 px-3 text-white hover:bg-white/15"
          onClick={() => onOpen(f)}
        >
          Open
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/12 bg-white/6 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-white/60">Taste graph</div>
        <div className="mt-2 grid gap-2">
          <TasteBar label="citrus" value={82} />
          <TasteBar label="fresh spicy" value={66} />
          <TasteBar label="powdery" value={54} />
        </div>
      </div>
    </div>
  );
}

function TasteBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-white/65">{label}</div>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.9),rgba(244,114,182,0.9),rgba(99,102,241,0.9))]"
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="w-10 text-right text-xs text-white/60">{value}%</div>
    </div>
  );
}

function PeekReview({ onOpen }: { onOpen: (f: Fragrance) => void }) {
  const f = getDemoFragrance(2);

  if (!f) {
    return (
      <div className="rounded-2xl border border-white/12 bg-[#0b0b12]/55 p-4">
        <div className="text-sm font-semibold">Structured review</div>
        <div className="mt-2 text-sm text-white/70">
          Add at least 1 fragrance in <code className="text-white/80">landing.data.ts</code> to show the demo.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/12 bg-[#0b0b12]/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Structured review</div>
          <div className="text-xs text-white/60">Comparable, not vibes-only.</div>
        </div>
        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75">@eddie</span>
      </div>

      <button
        onClick={() => onOpen(f)}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-white/12 bg-white/6 p-3 text-left hover:bg-white/10"
      >
        <SmartImage
          src={f.imageUrl}
          fallbacks={f.imageFallbacks}
          alt={`${f.brand} ${f.name}`}
          className="h-11 w-11 rounded-xl object-cover"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{f.name}</div>
          <div className="truncate text-xs text-white/60">{f.brand}</div>
        </div>
        <div className="ml-auto rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">
          {ratingText(f.rating)}
        </div>
      </button>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <Score label="smell" score="5/5" />
        <Score label="performance" score="5/5" />
        <Score label="value" score="3/5" />
      </div>

      <div className="mt-3 rounded-2xl border border-white/12 bg-white/6 p-4 text-sm text-white/72">
        Fresh spicy + amber with a bright opening. Reliable, loud, and easy — but the “everywhere” factor is real.
      </div>
    </div>
  );
}

function Score({ label, score }: { label: string; score: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/6 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-sm font-semibold">{score}</div>
    </div>
  );
}

function PeekNotes({ notes }: { notes: NoteItem[] }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-[#0b0b12]/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Note art (clean)</div>
          <div className="text-xs text-white/60">Lives on the fragrance detail page.</div>
        </div>
        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75">scan fast</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {notes.length ? (
          notes.map((n) => <NoteBadge key={n.imageUrl || n.name} note={n} />)
        ) : (
          <div className="text-sm text-white/70">
            Add fragrances with notes in <code className="text-white/80">landing.data.ts</code> to show note badges.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/12 bg-white/6 p-4 text-sm text-white/72">
        Instead of a messy list of notes, we show visual note badges + clusters so you remember scents faster.
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
            className="rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
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
