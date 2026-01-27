export type NoteItem = { name: string; imageUrl?: string; fallbackUrls?: string[] };
export type NotesByStage = { Top?: NoteItem[]; Middle?: NoteItem[]; Base?: NoteItem[] };

export type Fragrance = {
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

export const FRAGRANCES: Fragrance[] = [
  {
    name: "Pacific Chill",
    brand: "Louis Vuitton",
    rating: "4.02",
    imageUrl: "https://d2k6fvhyk5xgx.cloudfront.net/images/pacific-chill-louis-vuitton-unisex.jpg",
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
];

export const landingCopy = {
  pills: ["Log fast", "Structured reviews", "Top 3", "Note art"],
  why: [
    { title: "Consistency", desc: "Structured ratings so reviews are comparable — not random essays." },
    { title: "Visual notes", desc: "Note art makes scents easier to remember and faster to scan." },
    { title: "Taste graphs", desc: "See patterns in what you like — then discover smarter." },
  ],
  diffs: [
    { title: "Comparable reviews", desc: "Smell, performance, value — the same rubric across everyone." },
    { title: "Notes that pop", desc: "Note art and clusters make the “why it works” obvious." },
    { title: "Discovery by taste", desc: "Follow people who match your vibe — not generic “most popular.”" },
  ],
  steps: [
    { title: "Add a scent", desc: "Search and add to your collection or wishlist." },
    { title: "Review consistently", desc: "Same rubric every time so your taste becomes readable." },
    { title: "Discover by people", desc: "Follow profiles that match your vibe and explore their picks." },
  ],
  faqs: [
    { q: "Is this a waitlist?", a: "Right now yes — sign up and you’ll be first in when we open invites." },
    { q: "Do you support niche + designers?", a: "That’s the goal. Discovery works best when catalog coverage is deep." },
    { q: "Is it free?", a: "Core logging + profiles will be free. Later: optional premium insights." },
  ],
};
