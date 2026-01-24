import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

type NoteItem = { name: string; imageUrl?: string; fallbackUrls?: string[] };
type NotesByStage = { Top?: NoteItem[]; Middle?: NoteItem[]; Base?: NoteItem[] };

type Fragrance = {
  name: string;
  brand: string;
  rating?: string;
  imageUrl?: string;
  imageFallbacks?: string[];
  longevity?: string;
  sillage?: string;
  mainAccords?: string[];
  notes?: NotesByStage;
};

const FRAGRANCES: Fragrance[] = [
  {
    name: "Pacific Chill",
    brand: "Louis Vuitton",
    rating: "4.02",
    imageUrl:
      "https://d2k6fvhyk5xgx.cloudfront.net/images/pacific-chill-louis-vuitton-unisex.jpg",
    longevity: "Moderate",
    sillage: "Moderate",
    mainAccords: ["citrus", "fruity", "green", "fresh spicy", "sweet"],
    notes: {
      Top: [
        { name: "Citron", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Citron.png" },
        { name: "Mint", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Mint.png" },
        { name: "Orange", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Orange.png" },
      ],
      Middle: [
        { name: "Apricot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Apricot.png" },
        { name: "Basil", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Basil.png" },
      ],
      Base: [
        { name: "Fig", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Fig.png" },
        { name: "May Rose", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/May%20Rose.png" },
      ],
    },
  },
  {
    name: "Sospiro Vibrato",
    brand: "Sospiro",
    rating: "4.40",
    imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/images/sospiro-vibrato.jpg",
    longevity: "Long Lasting",
    sillage: "Strong",
    mainAccords: ["citrus", "powdery", "fresh spicy", "woody"],
    notes: {
      Top: [
        { name: "Grapefruit", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Grapefruit.png" },
        { name: "Bergamot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Bergamot.png" },
      ],
      Middle: [
        { name: "Ginger", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ginger.png" },
        { name: "Jasmine", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Jasmine.png" },
      ],
      Base: [
        { name: "Musk", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Musk.png" },
        { name: "Amber", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Amber.png" },
      ],
    },
  },
  {
    name: "Dior Sauvage",
    brand: "Christian Dior",
    rating: "4.16",
    imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/images/dior-sauvage.jpg",
    imageFallbacks: ["https://cdn.fragrancenet.com/images/photos/600x600/283046.jpg"],
    longevity: "Long Lasting",
    sillage: "Strong",
    mainAccords: ["fresh spicy", "amber", "citrus", "woody"],
    notes: {
      Top: [
        {
          name: "Calabrian Bergamot",
          imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Calabrian%20Bergamot.png",
          fallbackUrls: ["https://d2k6fvhyk5xgx.cloudfront.net/note_images/Bergamot.png"],
        },
        { name: "Pink Pepper", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Pink%20Pepper.png" },
      ],
      Middle: [
        { name: "Lavender", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Lavender.png" },
        { name: "Patchouli", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Patchouli.png" },
      ],
      Base: [
        { name: "Ambroxan", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ambroxan.png" },
        { name: "Cedar", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Cedar.png" },
      ],
    },
  },
  {
    name: "Creed Virgin Island Water",
    brand: "Creed",
    rating: "3.79",
    imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/images/creed-virgin-island-water.jpg",
    imageFallbacks: ["https://cdn.fragrancenet.com/images/photos/600x600/298370.jpg"],
    longevity: "Moderate",
    sillage: "Moderate",
    mainAccords: ["citrus", "coconut", "sweet", "rum"],
    notes: {
      Top: [
        { name: "Coconut", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Coconut.png" },
        { name: "Lime", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Lime.png" },
      ],
      Middle: [
        { name: "Ginger", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ginger.png" },
        { name: "Hibiscus", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Hibiscus.png" },
      ],
      Base: [
        { name: "White Rum", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/White%20Rum.png" },
        { name: "Musk", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Musk.png" },
      ],
    },
  },
];

function ratingText(r?: string) {
  if (!r) return "—";
  const n = Number(r);
  return Number.isNaN(n) ? r : n.toFixed(2);
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function SmartImage({
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

function NoteBadge({ note }: { note: NoteItem }) {
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
  

/** A distinct background: brighter “ink + aurora” vibe, not generic dark */
function AuraBackground() {
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

      {/* noise */}
      <div className="absolute inset-0 opacity-[0.08] [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.22%22/%3E%3C/svg%3E')]" />
    </div>
  );
}

function GlassCard({
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75">
      {children}
    </span>
  );
}

function PeekTabs({
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
        "rounded-full px-3 py-1.5 text-xs transition",
        tab === id ? "bg-white/14 text-white" : "text-white/60 hover:bg-white/6 hover:text-white"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/12 bg-white/6 p-1">
      {btn("taste", "Taste")}
      {btn("review", "Review")}
      {btn("notes", "Notes")}
    </div>
  );
}

export default function LandingPage() {
  const [tab, setTab] = useState<"taste" | "review" | "notes">("taste");
  const [open, setOpen] = useState<Fragrance | null>(null);

  const noteStrip = useMemo(() => {
    const notes: NoteItem[] = [];
    for (const f of FRAGRANCES) {
      (f.notes?.Top ?? []).forEach((n) => notes.push(n));
      (f.notes?.Middle ?? []).forEach((n) => notes.push(n));
      (f.notes?.Base ?? []).forEach((n) => notes.push(n));
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
    <div className="min-h-screen text-white">
      <AuraBackground />

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07070b]/55 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-white/12 bg-white/7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.25),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(244,114,182,0.22),transparent_55%)]" />
              <span className="relative text-sm font-semibold">S</span>
            </div>
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

      <main className="mx-auto max-w-6xl px-4">
        {/* HERO */}
        <section className="pt-10 md:pt-14">
          <div className="grid gap-8 md:grid-cols-[1.08fr_0.92fr] md:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <Pill>Log fast</Pill>
                <Pill>Structured reviews</Pill>
                <Pill>Top 3</Pill>
                <Pill>Note art</Pill>
              </div>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                Your taste,{" "}
                <span className="bg-[linear-gradient(90deg,rgba(34,211,238,1),rgba(244,114,182,1),rgba(99,102,241,1))] bg-clip-text text-transparent">
                  made visible
                </span>
                .
              </h1>

              <p className="mt-4 max-w-xl text-base text-white/72 md:text-lg">
                Stacta is a social fragrance log where <span className="text-white">reviews stay consistent</span>,
                <span className="text-white"> notes are visual</span>, and discovery comes from people whose taste you
                actually trust.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button className="h-11 rounded-xl px-6">Join the waitlist</Button>
                <Button
                  variant="secondary"
                  className="h-11 rounded-xl border border-white/12 bg-white/10 px-6 text-white hover:bg-white/15"
                  onClick={() => setTab("review")}
                >
                  See a quick peek
                </Button>
              </div>

              {/* WHY DIFFERENT (short, clear, not salesy) */}
              <div className="mt-8 grid gap-3 md:grid-cols-3">
                <WhyCard
                  title="Consistency"
                  desc="Structured ratings so reviews are comparable — not random essays."
                  accent="from-cyan-400/40"
                />
                <WhyCard
                  title="Visual notes"
                  desc="Note art makes scents easier to remember and faster to scan."
                  accent="from-pink-400/40"
                />
                <WhyCard
                  title="Taste graphs"
                  desc="See patterns in what you like — then discover smarter."
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

        {/* ABOUT (a little more detail, still tight) */}
        <section className="py-12">
          <div className="grid gap-5 md:grid-cols-[1fr_1fr] md:items-start">
            <GlassCard className="p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
                What we are
              </div>
              <div className="mt-2 text-2xl font-semibold md:text-3xl">
                A fragrance profile that actually explains you.
              </div>
              <p className="mt-3 text-sm text-white/72 md:text-base">
                Most apps stop at “owned” and a star rating. Stacta is built around taste:
                the scents you wear, how they perform, and how your preferences evolve over time.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill>Collection + wishlist</Pill>
                <Pill>Reviews with structure</Pill>
                <Pill>Top 3 drops</Pill>
                <Pill>Share-ready cards</Pill>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
                Why different
              </div>
              <div className="mt-2 space-y-3">
                <DiffRow
                  title="Comparable reviews"
                  desc="Smell, performance, value — the same rubric across everyone."
                />
                <DiffRow
                  title="Notes that pop"
                  desc="Note art and clusters make the “why it works” obvious."
                />
                <DiffRow
                  title="Discovery by taste"
                  desc="Follow people who match your vibe — not generic “most popular.”"
                />
              </div>
            </GlassCard>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-14">
          <GlassCard className="p-6 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-2xl font-semibold md:text-3xl">
                  Build a profile worth sharing.
                </div>
                <div className="mt-2 max-w-xl text-white/72">
                  If you’re tired of messy notes and meaningless stars, you’re gonna love Stacta.
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="h-11 rounded-xl px-6">Join the waitlist</Button>
              </div>
            </div>
          </GlassCard>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-white/60">© {new Date().getFullYear()} Stacta</div>
          <div className="text-sm text-white/60">Taste-first fragrance discovery.</div>
        </div>
      </footer>

      {open && <FragranceModal fragrance={open} onClose={() => setOpen(null)} />}
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
  accent: string; // tailwind gradient helper piece
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

function DiffRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/6 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/72">{desc}</div>
    </div>
  );
}

function PeekTaste({ onOpen }: { onOpen: (f: Fragrance) => void }) {
  const f = FRAGRANCES[1];
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
          <span key={t} className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75">
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
  const f = FRAGRANCES[2];
  return (
    <div className="rounded-2xl border border-white/12 bg-[#0b0b12]/55 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Structured review</div>
          <div className="text-xs text-white/60">Comparable, not vibes-only.</div>
        </div>
        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75">
          @eddie
        </span>
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
        <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75">
          scan fast
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {notes.map((n) => (
          <NoteBadge key={n.imageUrl || n.name} note={n} />
        ))}
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
              <span key={a} className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-white/75">
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
