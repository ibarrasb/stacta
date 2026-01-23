import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

// -----------------------------
// Types (only what we render)
// -----------------------------
type NoteItem = { name: string; imageUrl: string };

type NotesByStage = {
  Top?: NoteItem[];
  Middle?: NoteItem[];
  Base?: NoteItem[];
};

type Fragrance = {
  name: string;
  brand: string;
  rating?: string;
  imageUrl: string;
  longevity?: string;
  sillage?: string;
  mainAccords?: string[];
  notes?: NotesByStage;
};

// -----------------------------
// Data (only what we need)
// - Removed: Ex Nihilo + Guerlain
// -----------------------------
const FRAGRANCES: Fragrance[] = [
  {
    name: "Pacific Chill",
    brand: "Louis Vuitton",
    rating: "4.02",
    imageUrl:
      "https://d2k6fvhyk5xgx.cloudfront.net/images/pacific-chill-louis-vuitton-unisex.jpg",
    longevity: "Moderate",
    sillage: "Moderate",
    mainAccords: ["citrus", "fruity", "aromatic", "green", "fresh spicy", "sweet"],
    notes: {
      Top: [
        { name: "Citron", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Citron.png" },
        { name: "Mint", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Mint.png" },
        { name: "Orange", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Orange.png" },
        { name: "Lemon", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Lemon.png" },
      ],
      Middle: [
        { name: "Apricot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Apricot.png" },
        { name: "Basil", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Basil.png" },
        { name: "May Rose", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/May%20Rose.png" },
      ],
      Base: [
        { name: "Fig", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Fig.png" },
        { name: "Dates", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Dates.png" },
        { name: "Ambrette", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ambrette.png" },
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
    mainAccords: ["citrus", "powdery", "fresh spicy", "woody", "green", "musky"],
    notes: {
      Top: [
        { name: "Grapefruit", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Grapefruit.png" },
        { name: "Bergamot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Bergamot.png" },
        { name: "Jasmine", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Jasmine.png" },
        { name: "Magnolia", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Magnolia.png" },
      ],
      Middle: [
        { name: "Ginger", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ginger.png" },
        { name: "Herbal Notes", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Herbal%20Notes.png" },
        { name: "Powdery Notes", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Powdery%20Notes.png" },
      ],
      Base: [
        { name: "Musk", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Musk.png" },
        { name: "Cedar", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Cedar.png" },
        { name: "Amber", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Amber.png" },
      ],
    },
  },
  {
    name: "Dior Sauvage",
    brand: "Christian Dior",
    rating: "4.16",
    imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/images/dior-sauvage.jpg",
    longevity: "Long Lasting",
    sillage: "Strong",
    mainAccords: ["fresh spicy", "amber", "citrus", "aromatic", "musky", "woody"],
    notes: {
      Top: [
        { name: "Calabrian Bergamot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Calabrian%20Bergamot.png" },
        { name: "Pepper", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Pepper.png" },
      ],
      Middle: [
        { name: "Lavender", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Lavender.png" },
        { name: "Pink Pepper", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Pink%20Pepper.png" },
        { name: "Patchouli", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Patchouli.png" },
        { name: "Geranium", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Geranium.png" },
      ],
      Base: [
        { name: "Ambroxan", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ambroxan.png" },
        { name: "Cedar", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Cedar.png" },
      ],
    },
  },
  {
    name: "Creed Royal Water",
    brand: "Creed",
    rating: "3.95",
    imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/images/creed-royal-water.jpg",
    longevity: "Long Lasting",
    sillage: "Moderate",
    mainAccords: ["citrus", "fresh spicy", "fresh", "aromatic", "green", "musky"],
    notes: {
      Top: [
        { name: "Citruses", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Citruses.png" },
        { name: "Bergamot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Bergamot.png" },
        { name: "Mandarin Orange", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Mandarin%20Orange.png" },
      ],
      Middle: [
        { name: "Basil", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Basil.png" },
        { name: "Allspice", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Allspice.png" },
        { name: "Cumin", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Cumin.png" },
      ],
      Base: [
        { name: "Musk", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Musk.png" },
        { name: "Cedarwood", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Cedarwood.png" },
      ],
    },
  },
  {
    name: "Creed Virgin Island Water",
    brand: "Creed",
    rating: "3.79",
    imageUrl:
      "https://d2k6fvhyk5xgx.cloudfront.net/images/creed-virgin-island-water.jpg",
    longevity: "Moderate",
    sillage: "Moderate",
    mainAccords: ["citrus", "sweet", "coconut", "gourmand", "vanilla", "rum"],
    notes: {
      Top: [
        { name: "Coconut", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Coconut.png" },
        { name: "Lime", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Lime.png" },
        { name: "White Bergamot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/White%20Bergamot.png" },
      ],
      Middle: [
        { name: "Ginger", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ginger.png" },
        { name: "Hibiscus", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Hibiscus.png" },
        { name: "Indian Jasmine", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Indian%20Jasmine.png" },
      ],
      Base: [
        { name: "White Rum", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/White%20Rum.png" },
        { name: "Sugar Cane", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Sugar%20Cane.png" },
        { name: "Musk", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Musk.png" },
      ],
    },
  },
  {
    name: "Xerjoff Erba Gold",
    brand: "Xerjoff",
    rating: "4.30",
    imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/images/xerjoff-erba-gold.jpg",
    longevity: "Long Lasting",
    sillage: "Strong",
    mainAccords: ["citrus", "fruity", "fresh", "warm spicy", "sweet", "musky"],
    notes: {
      Top: [
        { name: "Brazilian Orange", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Brazilian%20Orange.png" },
        { name: "Sicilian Lemon", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Sicilian%20Lemon.png" },
        { name: "Calabrian Bergamot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Calabrian%20Bergamot.png" },
        { name: "Ginger", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ginger.png" },
      ],
      Middle: [
        { name: "Melon", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Melon.png" },
        { name: "Pear", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Pear.png" },
        { name: "Cinnamon", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Cinnamon.png" },
      ],
      Base: [
        { name: "White Musk", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/White%20Musk.png" },
        { name: "Amber", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Amber.png" },
        { name: "Madagascar Vanilla", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Madagascar%20Vanilla.png" },
      ],
    },
  },
  {
    name: "Parfums De Marly Percival",
    brand: "Parfums De Marly",
    rating: "3.94",
    imageUrl:
      "https://d2k6fvhyk5xgx.cloudfront.net/images/parfums-de-marly-percival.jpg",
    longevity: "Long Lasting",
    sillage: "Moderate",
    mainAccords: ["amber", "woody", "aromatic", "citrus", "fresh spicy", "lavender"],
    notes: {
      Top: [
        { name: "Lavender", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Lavender.png" },
        { name: "Mandarin Orange", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Mandarin%20Orange.png" },
        { name: "Bergamot", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Bergamot.png" },
      ],
      Middle: [
        { name: "Jasmine", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Jasmine.png" },
        { name: "Coriander", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Coriander.png" },
        { name: "Cinnamon", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Cinnamon.png" },
      ],
      Base: [
        { name: "Ambroxan", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Ambroxan.png" },
        { name: "Musk", imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/note_images/Musk.png" },
      ],
    },
  },
];

// -----------------------------
// Helpers
// -----------------------------
function ratingText(r?: string) {
  if (!r) return "—";
  const n = Number(r);
  if (Number.isNaN(n)) return r;
  return n.toFixed(2);
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function pill(text: string) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
      {text}
    </span>
  );
}

// -----------------------------
// Page
// -----------------------------
export default function LandingPage() {
  const [open, setOpen] = useState<Fragrance | null>(null);

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <BackgroundFX />

      <Header />

      <main>
        <Hero />

        <section id="social-proof" className="mx-auto max-w-6xl px-4 py-12">
          <SectionTitle
            eyebrow="What you can do"
            title="Track, rate, and share what you wear."
            subtitle="A clean way to log your collection, publish honest reviews, and discover scents through people you trust."
          />
          <FeatureGrid />
        </section>

        <section id="feed" className="mx-auto max-w-6xl px-4 py-12">
          <SectionTitle
            eyebrow="The loop"
            title="A feed that actually helps you find your next favorite."
            subtitle="New reviews, fresh Top 3 drops, and quick “why it works” context — all in one scroll."
          />
          <div className="mt-8 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
            <FeedMock onOpen={setOpen} />
            <ProfileMock onOpen={setOpen} />
          </div>
        </section>

        <section id="notes" className="mx-auto max-w-6xl px-4 py-12">
          <SectionTitle
            eyebrow="Notes, visualized"
            title="Make notes instantly readable."
            subtitle="Instead of walls of text, show note art in a dedicated section — easier to scan, easier to remember."
          />
          <NotesShowcase fragrances={FRAGRANCES} />
        </section>

        <section id="cta" className="mx-auto max-w-6xl px-4 py-14">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-2xl font-semibold md:text-3xl">
                  Notes worth sharing.
                </div>
                <div className="mt-2 max-w-xl text-white/70">
                  Build your collection, leave honest reviews, and discover what’s next —
                  through people with taste.
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="h-11 rounded-xl px-6">Join the waitlist</Button>
                <Button
                  variant="secondary"
                  className="h-11 rounded-xl border border-white/10 bg-white/10 px-6 text-white hover:bg-white/15"
                >
                  Explore a sample profile
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {open && <FragranceModal fragrance={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// -----------------------------
// UI Sections
// -----------------------------
function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050507]/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
            <span className="text-sm font-semibold">S</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Stacta</div>
            <div className="text-xs text-white/60">Notes worth sharing.</div>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <a href="#feed" className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            Feed
          </a>
          <a href="#notes" className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            Notes
          </a>
          <a href="#cta" className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            Get in
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="hidden h-9 rounded-xl border border-white/10 bg-white/10 px-4 text-white hover:bg-white/15 md:inline-flex"
          >
            Sign in
          </Button>
          <Button className="h-9 rounded-xl px-4">Join</Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10 md:pt-14">
      <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            {pill("Add fast")}
            {pill("Honest reviews")}
            {pill("Top 3 drops")}
            {pill("Discovery feed")}
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
            Your collection, your taste —
            <span className="block text-white/70">made shareable.</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-white/70 md:text-lg">
            Log what you wear. Rate it consistently. Show your Top 3. Build a profile that
            actually reflects your taste — and discover new scents through people you trust.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="h-11 rounded-xl px-6">Create your profile</Button>
            <Button
              variant="secondary"
              className="h-11 rounded-xl border border-white/10 bg-white/10 px-6 text-white hover:bg-white/15"
            >
              See how it works
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              structured ratings
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              collection + wishlist
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              built for sharing
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Trending right now</div>
              <div className="text-xs text-white/60">Tap a card to preview.</div>
            </div>
            <div className="text-xs text-white/60">live demo</div>
          </div>

          <div className="mt-4 grid gap-3">
            {FRAGRANCES.slice(0, 4).map((f) => (
              <button
                key={`${f.brand}-${f.name}`}
                onClick={() => {}}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-950/35 p-3 text-left hover:bg-white/5"
              >
                <img
                  src={f.imageUrl}
                  alt={`${f.brand} ${f.name}`}
                  className="h-12 w-12 rounded-xl object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{f.name}</div>
                  <div className="truncate text-xs text-white/60">{f.brand}</div>
                  <div className="mt-1 text-xs text-white/60">
                    {f.longevity ?? "—"} • {f.sillage ?? "—"} • {ratingText(f.rating)}
                  </div>
                </div>
                <div className="text-xs text-white/50">→</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const items = [
    {
      title: "Collection that feels alive",
      desc: "A grid you actually want to show: collection, wishlist, Top 3, and quick stats.",
      icon: "📦",
    },
    {
      title: "Honest, consistent reviews",
      desc: "Structured ratings so reviews mean something — not random paragraphs.",
      icon: "⭐️",
    },
    {
      title: "Discovery through taste",
      desc: "Follow people who match your vibe and let the feed do the work.",
      icon: "🧭",
    },
    {
      title: "Share-ready by default",
      desc: "Clean cards and pages so sharing feels natural when you want to.",
      icon: "🪄",
    },
  ];

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      {items.map((it) => (
        <div
          key={it.title}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-neutral-950/40">
              <span className="text-lg">{it.icon}</span>
            </div>
            <div className="text-lg font-semibold">{it.title}</div>
          </div>
          <p className="mt-3 text-sm text-white/70">{it.desc}</p>
        </div>
      ))}
    </div>
  );
}

function FeedMock({ onOpen }: { onOpen: (f: Fragrance) => void }) {
  const feed = [
    {
      user: { handle: "scent.curator", name: "Marco" },
      action: "reviewed",
      fragrance: FRAGRANCES.find((f) => f.name === "Sospiro Vibrato")!,
      blurb: "Electric citrus → powdery warmth. Feels expensive and clean.",
      ratings: { smell: 5, performance: 5, overall: 5 },
    },
    {
      user: { handle: "notesandnose", name: "Nia" },
      action: "posted a Top 3",
      fragrance: FRAGRANCES.find((f) => f.name === "Pacific Chill")!,
      blurb: "Fresh, bright, and addictive. My go-to when I want easy confidence.",
      ratings: { smell: 4, performance: 3, overall: 4 },
    },
    {
      user: { handle: "dailywear", name: "Chris" },
      action: "reviewed",
      fragrance: FRAGRANCES.find((f) => f.name === "Parfums De Marly Percival")!,
      blurb: "Clean and versatile. Works in almost any setting.",
      ratings: { smell: 4, performance: 4, overall: 4 },
    },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Feed</div>
          <div className="text-xs text-white/60">Reviews + Top 3 drops</div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          cursor
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {feed.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-neutral-950/35 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm">
                  <span className="font-semibold">{item.user.name}</span>{" "}
                  <span className="text-white/60">@{item.user.handle}</span>
                </div>
                <div className="text-xs text-white/60">
                  {item.action}{" "}
                  <button
                    onClick={() => onOpen(item.fragrance)}
                    className="font-semibold text-white/80 hover:text-white"
                  >
                    {item.fragrance.name}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="rounded-full bg-white/10 px-2 py-1">
                  {item.ratings.overall}/5
                </span>
              </div>
            </div>

            <p className="mt-3 text-sm text-white/70">{item.blurb}</p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                smell {item.ratings.smell}/5
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                performance {item.ratings.performance}/5
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                overall {item.ratings.overall}/5
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileMock({ onOpen }: { onOpen: (f: Fragrance) => void }) {
  const top3 = [
    FRAGRANCES.find((f) => f.name === "Sospiro Vibrato")!,
    FRAGRANCES.find((f) => f.name === "Dior Sauvage")!,
    FRAGRANCES.find((f) => f.name === "Pacific Chill")!,
  ];

  const collection = [
    FRAGRANCES.find((f) => f.name === "Parfums De Marly Percival")!,
    FRAGRANCES.find((f) => f.name === "Creed Virgin Island Water")!,
    FRAGRANCES.find((f) => f.name === "Xerjoff Erba Gold")!,
    FRAGRANCES.find((f) => f.name === "Creed Royal Water")!,
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Sample profile</div>
          <div className="text-xs text-white/60">Top 3 + collection preview</div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
          public
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-neutral-950/35 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5">
            <span className="text-sm font-semibold">ED</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Eddie</div>
            <div className="truncate text-xs text-white/60">@eddie</div>
          </div>
          <div className="ml-auto">
            <Button
              variant="secondary"
              className="h-9 rounded-xl border border-white/10 bg-white/10 px-4 text-white hover:bg-white/15"
            >
              Follow
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="collection" value="42" />
          <Stat label="reviews" value="18" />
          <Stat label="top 3 drops" value="9" />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Top 3</div>
          <div className="text-xs text-white/60">tap to preview</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {top3.map((f, idx) => (
            <Top3Mini key={idx} rank={(idx + 1) as 1 | 2 | 3} f={f} onOpen={() => onOpen(f)} />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Collection</div>
          <div className="text-xs text-white/60">quick look</div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {collection.map((f) => (
            <button
              key={`${f.brand}-${f.name}`}
              onClick={() => onOpen(f)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-950/35 p-3 text-left hover:bg-white/5"
            >
              <img
                src={f.imageUrl}
                alt={`${f.brand} ${f.name}`}
                className="h-10 w-10 rounded-xl object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{f.name}</div>
                <div className="truncate text-[11px] text-white/60">{f.brand}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotesShowcase({ fragrances }: { fragrances: Fragrance[] }) {
  const allNotes = useMemo(() => {
    const list: Array<{ note: NoteItem; stage: "Top" | "Middle" | "Base" }> = [];

    for (const f of fragrances) {
      const top = f.notes?.Top ?? [];
      const mid = f.notes?.Middle ?? [];
      const base = f.notes?.Base ?? [];

      top.forEach((n) => list.push({ note: n, stage: "Top" }));
      mid.forEach((n) => list.push({ note: n, stage: "Middle" }));
      base.forEach((n) => list.push({ note: n, stage: "Base" }));
    }

    // dedupe by imageUrl so we don’t show repeats
    const seen = new Set<string>();
    const unique: Array<{ note: NoteItem; stage: "Top" | "Middle" | "Base" }> = [];
    for (const item of list) {
      if (!item.note?.imageUrl) continue;
      if (seen.has(item.note.imageUrl)) continue;
      seen.add(item.note.imageUrl);
      unique.push(item);
    }

    return unique.slice(0, 28);
  }, [fragrances]);

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Detailed notes section</div>
            <div className="mt-1 text-sm text-white/70">
              This is where the note art belongs — bigger, cleaner, and actually readable.
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
            visual-first
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {allNotes.slice(0, 12).map(({ note, stage }) => (
            <div
              key={note.imageUrl}
              className="group rounded-2xl border border-white/10 bg-neutral-950/35 p-3 hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
                  <img
                    src={note.imageUrl}
                    alt={note.name}
                    className="h-9 w-9 object-contain transition group-hover:scale-[1.06]"
                    loading="lazy"
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{note.name}</div>
                  <div className="text-xs text-white/60">{stage} note</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-neutral-950/35 p-4 text-sm text-white/70">
          Later: group by Top / Middle / Base, add “dominant themes”, and show note clusters on profiles.
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Note palette</div>
            <div className="mt-1 text-sm text-white/70">
              A clean grid of note art you can scan in seconds.
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
            fast scan
          </span>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {allNotes.map(({ note }) => (
            <div
              key={note.imageUrl}
              className="group grid place-items-center rounded-2xl border border-white/10 bg-neutral-950/35 p-3 hover:bg-white/10"
              title={note.name}
            >
              <img
                src={note.imageUrl}
                alt={note.name}
                className="h-10 w-10 object-contain transition group-hover:scale-[1.06]"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-white/60">
          The feed + profiles stay clean — notes get their own dedicated moment here.
        </div>
      </div>
    </div>
  );
}

function Top3Mini({ rank, f, onOpen }: { rank: 1 | 2 | 3; f: Fragrance; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="rounded-2xl border border-white/10 bg-neutral-950/35 p-3 text-left hover:bg-white/5"
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-white/80">#{rank}</div>
        <div className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
          {ratingText(f.rating)}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <img
          src={f.imageUrl}
          alt={`${f.brand} ${f.name}`}
          className="h-9 w-9 rounded-lg object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="truncate text-[12px] font-semibold">{f.name}</div>
          <div className="truncate text-[11px] text-white/60">{f.brand}</div>
        </div>
      </div>

      <div className="mt-2 text-[11px] text-white/60">
        {f.longevity ?? "—"} • {f.sillage ?? "—"}
      </div>
    </button>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/60">
        {eyebrow}
      </div>
      <div className="text-2xl font-semibold md:text-3xl">{title}</div>
      <div className="max-w-2xl text-sm text-white/70 md:text-base">{subtitle}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-white/60">{label}</div>
    </div>
  );
}

function FragranceModal({ fragrance, onClose }: { fragrance: Fragrance; onClose: () => void }) {
  const accordPills = (fragrance.mainAccords ?? []).slice(0, 6);
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b0b0f] p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={fragrance.imageUrl}
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
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        {accordPills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {accordPills.map((a) => (
              <span key={a} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-white/10 bg-neutral-950/35 p-4 text-sm text-white/70">
          This modal is just a landing demo. Later, this becomes the real fragrance page:
          reviews, collection status, and full notes breakdown.
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button className="h-11 rounded-xl px-6">Add to collection</Button>
          <Button
            variant="secondary"
            className="h-11 rounded-xl border border-white/10 bg-white/10 px-6 text-white hover:bg-white/15"
          >
            Write a review
          </Button>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-white/60">
          © {new Date().getFullYear()} Stacta — Notes worth sharing.
        </div>
        <div className="flex gap-2 text-sm text-white/60">
          <a className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white" href="#feed">
            Feed
          </a>
          <a className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white" href="#notes">
            Notes
          </a>
          <a className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white" href="#cta">
            Join
          </a>
        </div>
      </div>
    </footer>
  );
}

// -----------------------------
// Background FX (subtle)
// -----------------------------
function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_20%_10%,rgba(255,255,255,0.08),transparent_55%),radial-gradient(900px_700px_at_80%_20%,rgba(255,255,255,0.06),transparent_55%),radial-gradient(900px_700px_at_50%_90%,rgba(255,255,255,0.04),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,7,0.6),rgba(5,5,7,1))]" />
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -right-24 top-44 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
    </div>
  );
}
