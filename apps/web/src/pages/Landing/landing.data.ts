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
  pills: ["Collection tracking", "Top 3 profile", "Social follows", "Live activity"],
  why: [
    { title: "Profile-first", desc: "Build a fragrance identity with a collection, counters, and a curated Top 3." },
    { title: "Search to detail", desc: "Go from search to full fragrance pages with notes, accords, and performance data." },
    { title: "Social by taste", desc: "Follow collectors, view profiles, and discover through people instead of random lists." },
  ],
  diffs: [
    { title: "Real profile surface", desc: "Collection counts, review counts, and Top 3 are first-class, not buried." },
    { title: "Private or public", desc: "Set your account private and approve follow requests from notifications." },
    { title: "Feed + notifications", desc: "Track follows, reviews, and collection activity from one home timeline." },
  ],
  steps: [
    { title: "Set up your profile", desc: "Create your account, add your identity, and choose up to 3 signature fragrances." },
    { title: "Build your collection", desc: "Search fragrances, open detail pages, and add bottles you actually wear." },
    { title: "Follow and discover", desc: "Follow other profiles and use the home feed to find your next pickup." },
  ],
  faqs: [
    { q: "Can I use Stacta now?", a: "Yes. You can create an account, build a profile, and start using the core app flows." },
    { q: "Can I make my profile private?", a: "Yes. Private profiles require approved follow requests before activity is visible." },
    { q: "What should I do first?", a: "Search a fragrance, add it to your collection, then set your Top 3 and follow a few people." },
  ],
};
