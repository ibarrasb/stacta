// apps/web/src/pages/Fragrances/FragranceDetail.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BookmarkPlus, Check, ChevronDown, PenSquare, Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NoticeDialog from "@/components/ui/notice-dialog";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import ReportDialog from "@/components/ui/report-dialog";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import type { FragranceSearchResult } from "@/lib/api/fragrances";
import {
  createCommunityFragrance,
  deleteCommunityFragrance,
  getFragranceVoteSummary,
  getFragranceDetail,
  getFragranceRatingSummary,
  rateFragrance,
  searchCommunityFragrances,
  searchFragrances,
  searchNotes,
  upsertFragranceVote,
  updateCommunityFragrance,
  type CommunityVoteSummary,
  type NoteDictionaryItem,
} from "@/lib/api/fragrances";
import { addToCollection as addCollectionItem, addToWishlist as addWishlistItem } from "@/lib/api/collection";
import { getMe } from "@/lib/api/me";
import { reportCommunityFragrance } from "@/lib/api/note-moderation";
import { submitReview } from "@/lib/api/reviews";
import { uploadImageFile, validateImageUploadFile } from "@/lib/api/uploads";
import { getCreatorRatingSummary, rateCreator } from "@/lib/api/users";

import fragrancePlaceholder from "@/assets/illustrations/NotFound.png";
import defaultNoteImg from "@/assets/notes/default-note.png";

const DEFAULT_NOTE_IMG = defaultNoteImg;
const FALLBACK_FRAGRANCE_IMG = fragrancePlaceholder;


type Note = { id?: string | null; name: string; imageUrl: string | null };
type RankingItem = { name: string; score: number };
type StageKey = "TOP" | "MIDDLE" | "BASE";
type AccordDraft = { name: string; strength: 0 | 1 | 2 | 3 };

const LONGEVITY_EDIT_LABELS = ["", "Very weak", "Weak", "Moderate", "Long lasting", "Very long lasting"] as const;
const SILLAGE_EDIT_LABELS = ["", "Intimate", "Soft", "Moderate", "Strong", "Very strong"] as const;
const SIGNAL_EDIT_LABELS = ["", "Low", "Moderate", "High", "Very High"] as const;
const ACCORD_STRENGTH_LABELS = ["Low", "Moderate", "Prominent", "Dominant"] as const;
const CONCENTRATION_OPTIONS = [
  "Eau Fraiche",
  "Eau de Cologne (EdC)",
  "Eau de Toilette (EdT)",
  "Eau de Parfum (EdP)",
  "Eau de Parfum Intense",
  "Parfum",
  "Extrait de Parfum",
  "Elixir",
  "Perfume Oil / Attar",
  "Solid Perfume",
] as const;
const REVIEW_PRICE_OPTIONS = [
  { value: 1, label: "Very overpriced" },
  { value: 2, label: "A bit overpriced" },
  { value: 3, label: "Fair" },
  { value: 4, label: "Good value" },
  { value: 5, label: "Excellent value" },
] as const;
const COLLECTION_TAG_OPTIONS = [
  { value: "BLIND_BUY", label: "Blind Buy" },
  { value: "SAMPLED_FIRST", label: "Sampled First" },
  { value: "RECOMMENDED", label: "Recommended" },
  { value: "HYPE_TREND", label: "Hype/Trend" },
  { value: "DEAL_DISCOUNT", label: "Deal/Discount" },
  { value: "GIFT", label: "Gift" },
] as const;
const FRAGRANCE_REPORT_REASONS = [
  { value: "INAPPROPRIATE", label: "Inappropriate" },
  { value: "SPAM", label: "Spam" },
  { value: "OTHER", label: "Other" },
] as const;
const COMMUNITY_LONGEVITY_LEVEL_LABELS = ["", "Fleeting", "Weak", "Moderate", "Long lasting", "Endless"] as const;
const COMMUNITY_SILLAGE_LEVEL_LABELS = ["", "Skin scent", "Weak", "Moderate", "Strong", "Nuclear"] as const;
type PriceVoteValue =
  | "VERY_OVERPRICED"
  | "A_BIT_OVERPRICED"
  | "FAIR"
  | "GOOD_VALUE"
  | "EXCELLENT_VALUE"
  | "OVERPRICED"
  | "GREAT_VALUE";
type CollectionTagValue = (typeof COLLECTION_TAG_OPTIONS)[number]["value"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeLabel(s: any) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ");
}

function toVoteKey(label: string) {
  return String(label ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function fromVoteKey(key: string) {
  return key
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
    .join(" ");
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pct(n01: number) {
  return `${Math.round(clamp01(n01) * 100)}%`;
}

function levelLabelFrom01(value01: number, labels: readonly string[]) {
  const safe = clamp01(value01);
  if (safe <= 0) return "—";
  const idx = Math.max(1, Math.min(5, Math.round(safe * 5)));
  return labels[idx] ?? "—";
}

function priceVoteToScore(value: PriceVoteValue | null) {
  if (value === "VERY_OVERPRICED") return 1;
  if (value === "A_BIT_OVERPRICED") return 2;
  if (value === "FAIR") return 3;
  if (value === "GOOD_VALUE") return 4;
  if (value === "EXCELLENT_VALUE") return 5;
  if (value === "OVERPRICED") return 2;
  if (value === "GREAT_VALUE") return 4;
  return null;
}

function reviewPriceToCommunityVote(value: number | null): PriceVoteValue | null {
  if (value === null) return null;
  if (value <= 1) return "VERY_OVERPRICED";
  if (value === 2) return "A_BIT_OVERPRICED";
  if (value === 3) return "FAIR";
  if (value === 4) return "GOOD_VALUE";
  return "EXCELLENT_VALUE";
}

function reviewPriceLabel(value: number | null) {
  if (value === 1) return "Very overpriced";
  if (value === 2) return "A bit overpriced";
  if (value === 3) return "Fair";
  if (value === 4) return "Good value";
  if (value === 5) return "Excellent value";
  return null;
}

function reviewPriceToneClasses(value: number | null, active = false) {
  if (value === 1) return active
    ? "border-red-400/65 bg-red-500/22 text-red-100"
    : "border-red-300/30 bg-red-500/10 text-red-100/90 hover:bg-red-500/16";
  if (value === 2) return active
    ? "border-orange-300/65 bg-orange-400/20 text-orange-100"
    : "border-orange-300/30 bg-orange-500/10 text-orange-100/90 hover:bg-orange-500/16";
  if (value === 3) return active
    ? "border-white/45 bg-white/20 text-white"
    : "border-white/20 bg-white/10 text-white/85 hover:bg-white/15";
  if (value === 4) return active
    ? "border-emerald-300/65 bg-emerald-400/20 text-emerald-100"
    : "border-emerald-300/30 bg-emerald-500/10 text-emerald-100/90 hover:bg-emerald-500/16";
  if (value === 5) return active
    ? "border-green-300/70 bg-green-400/22 text-green-100"
    : "border-green-300/35 bg-green-500/10 text-green-100/90 hover:bg-green-500/16";
  return active
    ? "border-[#3EB489]/60 bg-[#3EB489]/20 text-[#9de2ca]"
    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white";
}

function getBarFillStyle(value01: number) {
  const v = clamp01(value01);
  const satA = Math.round(42 + v * 38);
  const satB = Math.round(56 + v * 40);
  const lightA = Math.round(66 - v * 18);
  const lightB = Math.round(58 - v * 22);
  const alphaA = (0.32 + v * 0.42).toFixed(3);
  const alphaB = (0.5 + v * 0.48).toFixed(3);
  const glow = (0.08 + v * 0.16).toFixed(3);

  return {
    backgroundImage: `linear-gradient(90deg, hsla(184, ${satA}%, ${lightA}%, ${alphaA}), hsla(170, ${satB}%, ${lightB}%, ${alphaB}))`,
    boxShadow: `0 0 12px hsla(178, 92%, 58%, ${glow})`,
  };
}

function labelToPercent(label: any, kind: "longevity" | "sillage" | "confidence" | "popularity") {
  const v = normalizeLabel(label);
  const numeric = String(label ?? "").match(/([1-5])\s*\/\s*5/i);
  if (numeric) return clamp01(Number(numeric[1]) / 5);

  if (kind === "longevity") {
    const map: Record<string, number> = {
      "very weak": 0.15,
      weak: 0.25,
      short: 0.28,
      "short lasting": 0.28,
      moderate: 0.5,
      medium: 0.5,
      average: 0.5,
      long: 0.75,
      "long lasting": 0.78,
      "very long": 0.9,
      "very long lasting": 0.92,
      beast: 0.95,
      "beast mode": 0.98,
    };
    return map[v] ?? 0;
  }

  if (kind === "sillage") {
    const map: Record<string, number> = {
      intimate: 0.22,
      soft: 0.28,
      close: 0.28,
      moderate: 0.5,
      medium: 0.5,
      strong: 0.78,
      heavy: 0.85,
      "very strong": 0.92,
      enormous: 0.95,
      "room filling": 0.95,
    };
    return map[v] ?? 0;
  }

  const map: Record<string, number> = {
    low: 0.25,
    medium: 0.55,
    moderate: 0.55,
    high: 0.78,
    "very high": 0.92,
    "extremely high": 0.97,
  };
  return map[v] ?? 0;
}

function sliderIndexFromLabel(label: any, labels: readonly string[]) {
  const v = normalizeLabel(label);
  if (!v) return 0;
  const idx = labels.findIndex((x) => normalizeLabel(x) === v);
  return idx < 0 ? 0 : idx;
}

function mapAccordsForEdit(fragrance: FragranceSearchResult | null): AccordDraft[] {
  if (!fragrance) return [];
  const out: AccordDraft[] = [];
  const map = fragrance.mainAccordsPercentage ?? null;
  if (map && typeof map === "object") {
    Object.entries(map).forEach(([name, level]) => {
      const key = String(name ?? "").trim();
      if (!key) return;
      const normalized = normalizeLabel(level);
      const strength =
        normalized === "dominant" ? 3 :
        normalized === "prominent" ? 2 :
        normalized === "moderate" ? 1 : 0;
      out.push({ name: key, strength: strength as 0 | 1 | 2 | 3 });
    });
  }
  if (!out.length && Array.isArray(fragrance.mainAccords)) {
    fragrance.mainAccords.forEach((name) => {
      const key = String(name ?? "").trim();
      if (!key) return;
      out.push({ name: key, strength: 1 });
    });
  }
  const dedup = new Map<string, AccordDraft>();
  out.forEach((x) => {
    const k = x.name.toLowerCase();
    if (!dedup.has(k)) dedup.set(k, x);
  });
  return Array.from(dedup.values()).slice(0, 20);
}

function normalizeNotes(input: any): { top: Note[]; middle: Note[]; base: Note[] } {
  const toList = (arr: any): Note[] => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((n: any) => ({
        id: typeof n?.id === "string" ? n.id : null,
        name: typeof n?.name === "string" ? n.name.trim() : "",
        imageUrl: typeof n?.imageUrl === "string" ? n.imageUrl : null,
      }))
      .filter((n: Note) => n.name.length > 0);
  };

  return {
    top: toList(input?.top ?? input?.Top),
    middle: toList(input?.middle ?? input?.Middle),
    base: toList(input?.base ?? input?.Base),
  };
}

const BAR_GRADIENTS = [
  "from-cyan-400 via-fuchsia-400 to-amber-400",
  "from-emerald-400 via-cyan-400 to-violet-400",
  "from-amber-400 via-rose-400 to-violet-400",
  "from-sky-400 via-violet-400 to-amber-400",
];

function hashIdx(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

function Bar({
  label,
  value01,
  rightText,
}: {
  label: string;
  value01: number;
  rightText?: string;
}) {
  const w = pct(value01);
  const fillStyle = getBarFillStyle(value01);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/70">{label}</div>
        {rightText ? <div className="text-xs font-medium text-white/85">{rightText}</div> : null}
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
        <div className="h-full rounded-full" style={{ width: w, ...fillStyle }} />
      </div>
    </div>
  );
}

function Stars({ value01 }: { value01: number }) {
  const stars = Math.max(0, Math.min(5, Math.round(clamp01(value01) * 5)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={cx("text-sm", i < stars ? "text-white" : "text-white/25")}>
          ★
        </span>
      ))}
    </div>
  );
}

function AverageStars({ value, max = 5 }: { value: number; max?: number }) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
  return (
    <div className="flex items-center gap-1" aria-label={`Average rating ${safe.toFixed(2)} out of ${max}`}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, safe - i));
        return (
          <span key={i} className="relative inline-block text-base leading-none text-white/25">
            ★
            <span
              className="absolute inset-y-0 left-0 overflow-hidden text-amber-200"
              style={{ width: `${Math.round(fill * 100)}%` }}
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

function normalizeHalfStar(value: number | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 2) / 2;
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function FragranceHalfStarInput({
  value,
  onSelect,
  disabled,
}: {
  value: number | null | undefined;
  onSelect: (next: number) => void;
  disabled?: boolean;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const safe = Math.max(0, Math.min(5, Number.isFinite(Number(value)) ? Number(value) : 0));
  const displayValue = hoverValue ?? safe;
  return (
    <div
      className="flex items-center gap-1.5"
      role="radiogroup"
      aria-label="Fragrance rating (half-star increments)"
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        const fill = Math.max(0, Math.min(1, displayValue - i));
        const leftValue = i + 0.5;
        const rightValue = star;
        return (
          <div key={star} className="relative h-5 w-5">
            <button
              type="button"
              className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer"
              onClick={() => onSelect(leftValue)}
              onMouseEnter={() => setHoverValue(leftValue)}
              disabled={disabled}
              aria-label={`Rate ${leftValue} stars`}
              aria-checked={Math.abs((value ?? 0) - leftValue) < 0.001}
              role="radio"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer"
              onClick={() => onSelect(rightValue)}
              onMouseEnter={() => setHoverValue(rightValue)}
              disabled={disabled}
              aria-label={`Rate ${rightValue} stars`}
              aria-checked={Math.abs((value ?? 0) - rightValue) < 0.001}
              role="radio"
            />
            <span className="pointer-events-none relative inline-block text-base leading-none text-white/25">
              ★
              <span
                className="absolute inset-y-0 left-0 overflow-hidden text-amber-200"
                style={{ width: `${Math.round(fill * 100)}%` }}
              >
                ★
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VibeChip({ text }: { text: string }) {
  const idx = hashIdx(text.toLowerCase(), BAR_GRADIENTS.length);
  const dotG = BAR_GRADIENTS[idx];

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-white/85 shadow-[0_1px_0_rgba(255,255,255,0.05)]">
      <span className={cx("h-2 w-2 rounded-full bg-gradient-to-r", dotG)} />
      <span className="truncate capitalize">{text}</span>
    </span>
  );
}

function NoteTile({ note }: { note: Note }) {
  const [src, setSrc] = useState(note.imageUrl || DEFAULT_NOTE_IMG);

  useEffect(() => {
    setSrc(note.imageUrl || DEFAULT_NOTE_IMG);
  }, [note.imageUrl]);

  return (
    <div className="group flex w-[92px] flex-col items-center gap-2 sm:w-[104px]">
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <img
          src={src}
          alt={note.name}
          className={cx(
            "h-full w-full object-cover transition duration-300",
            src === DEFAULT_NOTE_IMG ? "scale-[1.30] group-hover:scale-[1.38]" : "scale-100 group-hover:scale-[1.04]"
          )}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (src !== DEFAULT_NOTE_IMG) setSrc(DEFAULT_NOTE_IMG);
          }}
        />
      </div>
      <div className="w-full truncate text-center text-xs text-white/85">{note.name}</div>
    </div>
  );
}

function PyramidRow({ title, notes }: { title: string; notes: Note[] }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium tracking-wide text-white/60">{title.toUpperCase()}</div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {notes.length || 0}
        </span>
      </div>

      {notes.length ? (
        <div className="flex flex-wrap justify-center gap-4">
          {notes.map((n, i) => (
            <NoteTile key={`${n.name}-${i}`} note={n} />
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/50">—</div>
      )}
    </div>
  );
}

function EditablePyramidRow({
  title,
  notes,
  onRemove,
}: {
  title: string;
  notes: Note[];
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-medium tracking-wide text-white/60">{title.toUpperCase()}</div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
          {notes.length || 0}
        </span>
      </div>
      {notes.length ? (
        <div className="flex flex-wrap gap-2">
          {notes.map((n, i) => (
            <div key={`${n.id ?? n.name}-${i}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="max-w-[10rem] truncate text-xs text-white/85 sm:max-w-[14rem]">{n.name}</span>
              <button type="button" className="text-xs text-white/50 hover:text-white" onClick={() => onRemove(i)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-white/50">—</div>
      )}
    </div>
  );
}

function ConcentrationDropdown({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const node = rootRef.current;
      if (!node) return;
      const target = event.target as Node | null;
      if (target && !node.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white outline-none"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{value || "Select concentration"}</span>
        <ChevronDown className={cx("h-3.5 w-3.5 text-white/65 transition", open ? "rotate-180" : "")} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-56 overflow-auto rounded-xl border border-white/12 bg-[#0f1118]/96 p-1 shadow-[0_14px_28px_rgba(0,0,0,0.45)] backdrop-blur sm:right-auto sm:min-w-[240px]">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-white/80 transition hover:bg-white/10"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            <span>Select concentration</span>
            {!value ? <Check className="h-3.5 w-3.5 text-cyan-100" /> : null}
          </button>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-white/85 transition hover:bg-white/10"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span className="truncate">{option}</span>
              {value === option ? <Check className="h-3.5 w-3.5 text-cyan-100" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RankingCard({
  title,
  items,
  userStarsByKey,
  onVote,
  rankingNote,
}: {
  title: string;
  items: RankingItem[];
  userStarsByKey?: Record<string, number>;
  onVote?: (itemName: string, stars: number) => void;
  rankingNote?: string;
}) {
  const clean = (items ?? []).filter((x) => x && typeof x.name === "string" && Number.isFinite(x.score));
  const sorted = clean.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const max = Math.max(1, ...sorted.map((x) => x.score || 0));

  return (
    <div className="rounded-2xl border border-white/15 bg-black/20 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-white/80">{title}</div>
          <div className="mt-1 text-[11px] text-white/45">model score (compare within this fragrance)</div>
        </div>
        <div className="text-[10px] text-white/45">ranking</div>
      </div>

      <div className="mt-4 space-y-3">
        {sorted.length ? (
          sorted.map((it) => {
            const v01 = clamp01((it.score || 0) / max);
            const voteKey = toVoteKey(it.name);
            const userStars = Math.max(0, Math.min(5, userStarsByKey?.[voteKey] ?? 0));
            return (
              <div key={`${it.name}-${it.score}`} className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
                <div className="flex items-center gap-3">
                  <div className="w-20 shrink-0 truncate text-xs text-white/80 capitalize sm:w-24">{it.name}</div>
                  <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                    <div className="h-full rounded-full" style={{ width: pct(v01), ...getBarFillStyle(v01) }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pl-0 sm:gap-3 sm:pl-[6.75rem]">
                  <div className="shrink-0 text-right text-[11px] tabular-nums text-white/65 sm:min-w-[3.25rem]">{it.score.toFixed(2)}</div>
                  {onVote ? (
                    <div className="inline-flex min-w-0 shrink-0 items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const n = i + 1;
                        const lit = n <= userStars;
                        return (
                          <button
                            key={`${voteKey}-${n}`}
                            type="button"
                            className={cx(
                              "grid h-5 w-5 place-items-center rounded-md text-[12px] leading-none transition touch-manipulation sm:h-5 sm:w-5 sm:text-[12px]",
                              lit ? "text-amber-200" : "text-white/25 hover:text-white/60"
                            )}
                            onClick={() => onVote(it.name, userStars === n ? 0 : n)}
                            aria-label={`Rate ${it.name} ${n} star${n > 1 ? "s" : ""}`}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="shrink-0">
                      <Stars value01={v01} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-white/50">—</div>
        )}
      </div>

      <div className="mt-4 text-xs text-white/45">
        {rankingNote ?? "These are algorithmic suitability scores (notes + accords). Use them to compare options within this fragrance—not as an absolute 0–5 scale, and not as a global comparison across different fragrances."}
      </div>
    </div>
  );
}

function safeDecodeURIComponent(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function isSyntheticRouteId(v: string) {
  return /^f_[0-9a-f-]+_\d+$/i.test(v.trim());
}

function normalizeForMatch(v: string | null | undefined) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function hasUsableExternalId(v: string | null | undefined) {
  const id = String(v ?? "").trim();
  return Boolean(id) && !isSyntheticRouteId(id);
}

function collectionKey(source: string | null | undefined, externalId: string | null | undefined) {
  const s = String(source ?? "").trim().toUpperCase();
  const e = String(externalId ?? "").trim().toLowerCase();
  if (!s || !e) return "";
  return `${s}|${e}`;
}

function computeFragellaExternalId(
  brand: string | null | undefined,
  name: string | null | undefined,
  year: string | number | null | undefined
) {
  const b = normalizeForMatch(brand);
  const n = normalizeForMatch(name);
  const y = normalizeForMatch(year == null ? "" : String(year));
  if (!b && !n) return "";
  return `${b}|${n}|${y || "0"}`.trim();
}

function imageSourceLabel(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:")) return "Uploaded image";
  try {
    const u = new URL(raw);
    const leaf = u.pathname.split("/").filter(Boolean).pop() ?? "";
    return decodeURIComponent(leaf) || "Selected image";
  } catch {
    const leaf = raw.split("/").filter(Boolean).pop() ?? "";
    return leaf || "Selected image";
  }
}

function normalizePurchaseUrlForSubmit(raw: string) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export default function FragranceDetailPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { externalId } = useParams();

  const routeExternalId = externalId ? safeDecodeURIComponent(externalId) : null;
  const isCreateMode = routeExternalId === "new-community" || Boolean(location?.state?.createCommunity);

  const [loaded, setLoaded] = useState<FragranceSearchResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [retryTick, setRetryTick] = useState(0);
  const forceRefreshRef = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTitle, setNoticeTitle] = useState("Notice");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFragranceDialogOpen, setReportFragranceDialogOpen] = useState(false);
  const [reportFragranceReason, setReportFragranceReason] = useState<"SPAM" | "INAPPROPRIATE" | "OTHER">("INAPPROPRIATE");
  const [reportFragranceDetails, setReportFragranceDetails] = useState("");
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [collectionTagDialogOpen, setCollectionTagDialogOpen] = useState(false);
  const [collectionTagSelection, setCollectionTagSelection] = useState<CollectionTagValue>("BLIND_BUY");
  const [viewerCollectionKeys, setViewerCollectionKeys] = useState<Set<string>>(new Set());
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewPriceValue, setReviewPriceValue] = useState<number | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(false);
  const [deletingCommunity, setDeletingCommunity] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [viewerUser, setViewerUser] = useState<{ id: string | null; username: string | null } | null>(null);
  const [ratingState, setRatingState] = useState<{ average: number; count: number; userRating: number | null } | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [creatorRatingState, setCreatorRatingState] = useState<{ average: number; count: number; userRating: number | null } | null>(null);
  const [creatorRatingBusy, setCreatorRatingBusy] = useState(false);
  const [communityVoteSummary, setCommunityVoteSummary] = useState<CommunityVoteSummary | null>(null);
  const [communityVoteSaving, setCommunityVoteSaving] = useState(false);
  const [communityLongevityVote, setCommunityLongevityVote] = useState<number | null>(null);
  const [communitySillageVote, setCommunitySillageVote] = useState<number | null>(null);
  const [communityPriceVote, setCommunityPriceVote] = useState<PriceVoteValue | null>(null);
  const [communitySeasonVotes, setCommunitySeasonVotes] = useState<string[]>([]);
  const [communityOccasionVotes, setCommunityOccasionVotes] = useState<string[]>([]);
  const communityVoteAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const communityVoteLastSavedRef = useRef<string>("{}");
  const communityVoteHydratingRef = useRef(false);
  const communityVoteHydratedExternalIdRef = useRef<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [draftAccordInput, setDraftAccordInput] = useState("");
  const [draftNoteSearch, setDraftNoteSearch] = useState("");
  const [draftNoteResults, setDraftNoteResults] = useState<NoteDictionaryItem[]>([]);
  const [draftNoteAddedHint, setDraftNoteAddedHint] = useState<string | null>(null);
  const [draftStage, setDraftStage] = useState<StageKey>("TOP");
  const [draftBrand, setDraftBrand] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftYear, setDraftYear] = useState("");
  const [draftConcentration, setDraftConcentration] = useState("");
  const [draftImageUrl, setDraftImageUrl] = useState("");
  const [draftImageObjectKey, setDraftImageObjectKey] = useState<string | null>(null);
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null);
  const [draftPurchaseUrl, setDraftPurchaseUrl] = useState("");
  const [draftImageLabel, setDraftImageLabel] = useState("");
  const [draftImageError, setDraftImageError] = useState<string | null>(null);
  const [uploadingDraftImage, setUploadingDraftImage] = useState(false);
  const [draftLongevity, setDraftLongevity] = useState(0);
  const [draftSillage, setDraftSillage] = useState(0);
  const [draftConfidence, setDraftConfidence] = useState(0);
  const [draftPopularity, setDraftPopularity] = useState(0);
  const [draftVisibility, setDraftVisibility] = useState<"PRIVATE" | "PUBLIC">("PUBLIC");
  const [draftAccords, setDraftAccords] = useState<AccordDraft[]>([]);
  const [draftTopNotes, setDraftTopNotes] = useState<Note[]>([]);
  const [draftMiddleNotes, setDraftMiddleNotes] = useState<Note[]>([]);
  const [draftBaseNotes, setDraftBaseNotes] = useState<Note[]>([]);

  const stateFragrance = (location?.state?.fragrance ?? null) as (FragranceSearchResult & any) | null;
  const blankCreateFragrance = useMemo(() => ({
    source: "COMMUNITY",
    externalId: "new-community",
    name: "",
    brand: "",
    year: null,
    imageUrl: null,
    imageObjectKey: null,
    gender: null,
    rating: null,
    price: null,
    priceValue: null,
    purchaseUrl: null,
    oilType: null,
    longevity: null,
    sillage: null,
    confidence: null,
    popularity: null,
    mainAccords: [],
    generalNotes: [],
    mainAccordsPercentage: null,
    seasonRanking: [],
    occasionRanking: [],
    notes: { top: [], middle: [], base: [] },
    concentration: null,
    longevityScore: null,
    sillageScore: null,
    visibility: "PUBLIC",
    createdByUserId: null,
    createdByUsername: null,
    ratingCount: 0,
    userRating: null,
  } as (FragranceSearchResult & any)), []);
  const fragrance = (loaded ?? stateFragrance ?? (isCreateMode ? blankCreateFragrance : null)) as (FragranceSearchResult & any) | null;
  const sourceParam = useMemo(() => {
    const value = new URLSearchParams(location.search).get("source");
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    return normalized === "COMMUNITY" ? "COMMUNITY" : normalized === "FRAGELLA" ? "FRAGELLA" : null;
  }, [location.search]);

  const from = location?.state?.from as { pathname?: string; search?: string } | undefined;

  function inferPreferredSource(id: string): "FRAGELLA" | "COMMUNITY" | null {
    const s = id.toLowerCase();
    if (s.startsWith("community_") || s.startsWith("comm_") || s.startsWith("c_")) return "COMMUNITY";
    return "FRAGELLA";
  }

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setViewerUser({ id: me.id ?? null, username: me.username ?? null });
        const keys = new Set<string>();
        (me.collectionItems ?? []).forEach((item) => {
          const key = collectionKey(item.source, item.externalId);
          if (key) keys.add(key);
        });
        setViewerCollectionKeys(keys);
      })
      .catch(() => {
        if (cancelled) return;
        setViewerUser(null);
        setViewerCollectionKeys(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [fragrance, routeExternalId]);

  useEffect(() => {
    if (isCreateMode) return;
    if (!editingCommunity || !fragrance) return;
    setDraftBrand(String(fragrance.brand ?? ""));
    setDraftName(String(fragrance.name ?? ""));
    setDraftYear(String(fragrance.year ?? ""));
    setDraftConcentration(String((fragrance as any).concentration ?? fragrance.oilType ?? ""));
    setDraftImageUrl(String(fragrance.imageUrl ?? ""));
    setDraftImageObjectKey((fragrance as any).imageObjectKey ?? null);
    setDraftImageFile(null);
    setDraftImageError(null);
    setDraftPurchaseUrl(String(fragrance.purchaseUrl ?? ""));
    setDraftImageLabel(imageSourceLabel(fragrance.imageUrl));
    setDraftLongevity(sliderIndexFromLabel(fragrance.longevity ?? (fragrance as any)?.Longevity, LONGEVITY_EDIT_LABELS));
    setDraftSillage(sliderIndexFromLabel(fragrance.sillage ?? (fragrance as any)?.Sillage, SILLAGE_EDIT_LABELS));
    setDraftConfidence(sliderIndexFromLabel(fragrance.confidence ?? (fragrance as any)?.Confidence, SIGNAL_EDIT_LABELS));
    setDraftPopularity(sliderIndexFromLabel(fragrance.popularity ?? (fragrance as any)?.Popularity, SIGNAL_EDIT_LABELS));
    setDraftVisibility(String((fragrance as any)?.visibility ?? "PRIVATE").toUpperCase() === "PUBLIC" ? "PUBLIC" : "PRIVATE");
    setDraftAccords(mapAccordsForEdit(fragrance));
    setDraftTopNotes(normalizeNotes(fragrance.notes).top);
    setDraftMiddleNotes(normalizeNotes(fragrance.notes).middle);
    setDraftBaseNotes(normalizeNotes(fragrance.notes).base);
    setDraftAccordInput("");
    setDraftNoteSearch("");
    setDraftNoteResults([]);
    setDraftNoteAddedHint(null);
    setDraftStage("TOP");
  }, [editingCommunity, fragrance, isCreateMode]);

  useEffect(() => {
    if (!isCreateMode) return;
    setEditingCommunity(true);
    const seed = String(location?.state?.seedQuery ?? "").trim();
    setDraftBrand("");
    setDraftName(seed);
    setDraftYear("");
    setDraftConcentration("");
    setDraftImageUrl("");
    setDraftImageObjectKey(null);
    setDraftImageFile(null);
    setDraftImageError(null);
    setDraftPurchaseUrl("");
    setDraftImageLabel("");
    setDraftLongevity(0);
    setDraftSillage(0);
    setDraftConfidence(0);
    setDraftPopularity(0);
    setDraftVisibility("PUBLIC");
    setDraftAccords([]);
    setDraftTopNotes([]);
    setDraftMiddleNotes([]);
    setDraftBaseNotes([]);
    setDraftAccordInput("");
    setDraftNoteSearch("");
    setDraftNoteResults([]);
    setDraftNoteAddedHint(null);
    setDraftStage("TOP");
  }, [isCreateMode, location?.state]);

  useEffect(() => {
    if (!draftNoteAddedHint) return;
    const t = window.setTimeout(() => setDraftNoteAddedHint(null), 1400);
    return () => window.clearTimeout(t);
  }, [draftNoteAddedHint]);

  useEffect(() => {
    return () => {
      if (draftImageUrl && draftImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(draftImageUrl);
      }
    };
  }, [draftImageUrl]);

  useEffect(() => {
    if (!editingCommunity) return;
    const q = draftNoteSearch.trim();
    if (q.length < 2) {
      setDraftNoteResults([]);
      return;
    }
    let cancelled = false;
    searchNotes({ search: q, limit: 30 })
      .then((list) => {
        if (cancelled) return;
        setDraftNoteResults(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (cancelled) return;
        setDraftNoteResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editingCommunity, draftNoteSearch]);

  useEffect(() => {
    if (isCreateMode) return;
    if (!routeExternalId) return;

    const ctrl = new AbortController();

    setLoadError(null);
    setIsLoading(true);

    const preferred = sourceParam ?? inferPreferredSource(routeExternalId);

    const bypassCache = forceRefreshRef.current;
    forceRefreshRef.current = false;

    (async () => {
      let externalIdToLoad = routeExternalId;
      if (isSyntheticRouteId(externalIdToLoad)) {
        const fallbackName = String(stateFragrance?.name ?? "").trim();
        const fallbackBrand = String(stateFragrance?.brand ?? "").trim();

        if (fallbackName) {
          const query = [fallbackBrand, fallbackName].filter(Boolean).join(" ").trim() || fallbackName;
          const candidates = preferred === "COMMUNITY"
            ? await searchCommunityFragrances({ q: query, limit: 30 }, { signal: ctrl.signal })
            : await searchFragrances({ q: query, limit: 30, persist: true }, { signal: ctrl.signal });

          const targetName = normalizeForMatch(fallbackName);
          const targetBrand = normalizeForMatch(fallbackBrand);

          const exact = candidates.find((c) =>
            normalizeForMatch(c.name) === targetName &&
            normalizeForMatch(c.brand) === targetBrand &&
            hasUsableExternalId(c.externalId)
          );
          const byName = candidates.find((c) =>
            normalizeForMatch(c.name) === targetName && hasUsableExternalId(c.externalId)
          );

          externalIdToLoad = String((exact ?? byName)?.externalId ?? "").trim();
        } else {
          externalIdToLoad = "";
        }
      }

      if (!externalIdToLoad || isSyntheticRouteId(externalIdToLoad)) {
        if (!stateFragrance) {
          setLoadError("Could not load fragrance details. Open it from Search, or try again.");
        }
        return;
      }

      try {
        const first = await getFragranceDetail(
          { source: preferred ?? "FRAGELLA", externalId: externalIdToLoad },
          { signal: ctrl.signal, bypassCache }
        );
        setLoaded(first);
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }

      if (preferred !== "COMMUNITY") {
        try {
          const second = await getFragranceDetail(
            { source: "COMMUNITY", externalId: externalIdToLoad },
            { signal: ctrl.signal, bypassCache }
          );
          setLoaded(second);
          return;
        } catch (e: any) {
          if (e?.name === "AbortError") return;
        }
      }

      setLoadError("Could not load fragrance details. Open it from Search, or try again.");
    })()
      .catch((e: any) => {
        if (e?.name === "AbortError") return;
        setLoadError("Could not load fragrance details. Open it from Search, or try again.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setIsLoading(false);
      });

    return () => {
      ctrl.abort();
    };
  }, [routeExternalId, sourceParam, stateFragrance, retryTick, isCreateMode]);

  const accords = useMemo(() => {
    const a = fragrance?.mainAccords ?? [];
    return Array.isArray(a) ? a.filter(Boolean) : [];
  }, [fragrance]);

  const generalNotes = useMemo(() => {
    const n = fragrance?.generalNotes ?? [];
    return Array.isArray(n) ? n.filter(Boolean) : [];
  }, [fragrance]);

  const accordsPercent = useMemo(() => {
    const raw = fragrance?.mainAccordsPercentage ?? (fragrance as any)?.mainAccordsPercent ?? null;
    if (!raw || typeof raw !== "object") return null as null | Record<string, any>;
    return raw as Record<string, any>;
  }, [fragrance]);

  const noteGroups = useMemo(() => normalizeNotes(fragrance?.notes), [fragrance]);
  const hasStageNotes = noteGroups.top.length > 0 || noteGroups.middle.length > 0 || noteGroups.base.length > 0;

  const oilType = fragrance?.oilType ?? (fragrance as any)?.OilType ?? null;
  const longevityLabel = fragrance?.longevity ?? (fragrance as any)?.Longevity ?? null;
  const sillageLabel = fragrance?.sillage ?? (fragrance as any)?.Sillage ?? null;
  const confidenceLabel = fragrance?.confidence ?? (fragrance as any)?.Confidence ?? null;
  const popularityLabel = fragrance?.popularity ?? (fragrance as any)?.Popularity ?? null;

  const longevity01 = labelToPercent(longevityLabel, "longevity");
  const sillage01 = labelToPercent(sillageLabel, "sillage");
  const confidence01 = labelToPercent(confidenceLabel, "confidence");
  const popularity01 = labelToPercent(popularityLabel, "popularity");

  const seasonRanking: RankingItem[] = useMemo(() => {
    const r = fragrance?.seasonRanking ?? (fragrance as any)?.["Season Ranking"] ?? [];
    if (!Array.isArray(r)) return [];
    return r
      .map((x: any) => ({ name: String(x?.name ?? "").trim(), score: Number(x?.score) }))
      .filter((x: any) => x.name && Number.isFinite(x.score));
  }, [fragrance]);

  const occasionRanking: RankingItem[] = useMemo(() => {
    const r = fragrance?.occasionRanking ?? (fragrance as any)?.["Occasion Ranking"] ?? [];
    if (!Array.isArray(r)) return [];
    return r
      .map((x: any) => ({ name: String(x?.name ?? "").trim(), score: Number(x?.score) }))
      .filter((x: any) => x.name && Number.isFinite(x.score));
  }, [fragrance]);

  const communityLongevityBars = useMemo(() => {
    const rows = communityVoteSummary?.longevityRanking ?? [];
    const total = Math.max(1, Number(communityVoteSummary?.voters ?? 0));
    return rows.map((r) => ({ name: r.name, count: Number(r.score ?? 0), ratio: Number(r.score ?? 0) / total }));
  }, [communityVoteSummary]);
  const communitySillageBars = useMemo(() => {
    const rows = communityVoteSummary?.sillageRanking ?? [];
    const total = Math.max(1, Number(communityVoteSummary?.voters ?? 0));
    return rows.map((r) => ({ name: r.name, count: Number(r.score ?? 0), ratio: Number(r.score ?? 0) / total }));
  }, [communityVoteSummary]);
  const communityPriceBars = useMemo(() => {
    const rows = communityVoteSummary?.priceRanking ?? [];
    const total = Math.max(1, Number(communityVoteSummary?.voters ?? 0));
    return rows.map((r) => ({ name: r.name, count: Number(r.score ?? 0), ratio: Number(r.score ?? 0) / total }));
  }, [communityVoteSummary]);
  const communityLongevity01 = useMemo(() => {
    if (!communityLongevityBars.length) return 0;
    const idx: Record<string, number> = {
      fleeting: 1,
      weak: 2,
      moderate: 3,
      "long lasting": 4,
      endless: 5,
    };
    let weighted = 0;
    let total = 0;
    for (const row of communityLongevityBars) {
      const key = row.name.trim().toLowerCase();
      const stars = idx[key] ?? 0;
      weighted += stars * row.count;
      total += row.count;
    }
    return total > 0 ? clamp01((weighted / total) / 5) : 0;
  }, [communityLongevityBars]);
  const communitySillage01 = useMemo(() => {
    if (!communitySillageBars.length) return 0;
    const idx: Record<string, number> = {
      "skin scent": 1,
      weak: 2,
      moderate: 3,
      strong: 4,
      nuclear: 5,
    };
    let weighted = 0;
    let total = 0;
    for (const row of communitySillageBars) {
      const key = row.name.trim().toLowerCase();
      const stars = idx[key] ?? 0;
      weighted += stars * row.count;
      total += row.count;
    }
    return total > 0 ? clamp01((weighted / total) / 5) : 0;
  }, [communitySillageBars]);

  const addToCollection = useCallback(() => {
    if (addingToCollection) return;
    setCollectionTagSelection("BLIND_BUY");
    setCollectionTagDialogOpen(true);
  }, [addingToCollection]);

  const confirmAddToCollection = useCallback(async () => {
    const normalizedSource = String(fragrance?.source ?? inferPreferredSource(routeExternalId || "") ?? "FRAGELLA")
      .trim()
      .toUpperCase();
    const source = normalizedSource === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const externalFromFragrance = String(fragrance?.externalId ?? "").trim();
    const externalFromRoute = String(routeExternalId ?? "").trim();
    let external = externalFromFragrance || (!isSyntheticRouteId(externalFromRoute) ? externalFromRoute : "");
    const name = String(fragrance?.name ?? "").trim();
    const brand = String(fragrance?.brand ?? "").trim();

    if ((!external || isSyntheticRouteId(external)) && source === "FRAGELLA") {
      const computed = computeFragellaExternalId(brand, name, (fragrance as any)?.year ?? null);
      if (hasUsableExternalId(computed)) {
        external = computed;
      }
    }

    if ((!external || isSyntheticRouteId(external)) && name) {
      try {
        const query = [brand, name].filter(Boolean).join(" ").trim() || name;
        const candidates = source === "COMMUNITY"
          ? await searchCommunityFragrances({ q: query, limit: 30 })
          : await searchFragrances({ q: query, limit: 30, persist: true });

        const targetName = normalizeForMatch(name);
        const targetBrand = normalizeForMatch(brand);

        const exact = candidates.find((c) =>
          normalizeForMatch(c.name) === targetName &&
          normalizeForMatch(c.brand) === targetBrand &&
          hasUsableExternalId(c.externalId)
        );

        const byName = candidates.find((c) =>
          normalizeForMatch(c.name) === targetName && hasUsableExternalId(c.externalId)
        );

        external = String((exact ?? byName)?.externalId ?? "").trim();
      } catch {
        // keep fallback path below
      }
    }

    if (!external || isSyntheticRouteId(external) || !name) {
      setNoticeTitle("Collection");
      setNotice("Could not resolve a stable fragrance ID for this item yet.");
      return;
    }

    setAddingToCollection(true);
    try {
      const res = await addCollectionItem({
        source,
        externalId: external,
        name,
        brand: fragrance?.brand ?? null,
        imageUrl: fragrance?.imageUrl ?? null,
        collectionTag: collectionTagSelection,
      });
      const key = collectionKey(source, external);
      if (key) {
        setViewerCollectionKeys((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
      setCollectionTagDialogOpen(false);
      setNoticeTitle("Collection");
      setNotice(res.status === "ALREADY_EXISTS" ? "Already in collection." : "Added to collection.");
    } catch (e: any) {
      setNoticeTitle("Collection");
      setNotice(e?.message || "Failed to add fragrance to collection.");
    } finally {
      setAddingToCollection(false);
    }
  }, [collectionTagSelection, fragrance, routeExternalId]);

  const addToWishlist = useCallback(async () => {
    const normalizedSource = String(fragrance?.source ?? inferPreferredSource(routeExternalId || "") ?? "FRAGELLA")
      .trim()
      .toUpperCase();
    const source = normalizedSource === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const externalFromFragrance = String(fragrance?.externalId ?? "").trim();
    const externalFromRoute = String(routeExternalId ?? "").trim();
    let external = externalFromFragrance || (!isSyntheticRouteId(externalFromRoute) ? externalFromRoute : "");
    const name = String(fragrance?.name ?? "").trim();
    const brand = String(fragrance?.brand ?? "").trim();

    if ((!external || isSyntheticRouteId(external)) && source === "FRAGELLA") {
      const computed = computeFragellaExternalId(brand, name, (fragrance as any)?.year ?? null);
      if (hasUsableExternalId(computed)) {
        external = computed;
      }
    }

    if ((!external || isSyntheticRouteId(external)) && name) {
      try {
        const query = [brand, name].filter(Boolean).join(" ").trim() || name;
        const candidates = source === "COMMUNITY"
          ? await searchCommunityFragrances({ q: query, limit: 30 })
          : await searchFragrances({ q: query, limit: 30, persist: true });

        const targetName = normalizeForMatch(name);
        const targetBrand = normalizeForMatch(brand);

        const exact = candidates.find((c) =>
          normalizeForMatch(c.name) === targetName &&
          normalizeForMatch(c.brand) === targetBrand &&
          hasUsableExternalId(c.externalId)
        );

        const byName = candidates.find((c) =>
          normalizeForMatch(c.name) === targetName && hasUsableExternalId(c.externalId)
        );

        external = String((exact ?? byName)?.externalId ?? "").trim();
      } catch {
        // keep fallback path below
      }
    }

    if (!external || isSyntheticRouteId(external) || !name) {
      setNoticeTitle("Wishlist");
      setNotice("Could not resolve a stable fragrance ID for this item yet.");
      return;
    }

    setAddingToWishlist(true);
    try {
      await addWishlistItem({
        source,
        externalId: external,
        name,
        brand: fragrance?.brand ?? null,
        imageUrl: fragrance?.imageUrl ?? null,
      });
      setNoticeTitle("Wishlist");
      setNotice("Added to wishlist.");
    } catch (e: any) {
      setNoticeTitle("Wishlist");
      setNotice(e?.message || "Failed to add fragrance to wishlist.");
    } finally {
      setAddingToWishlist(false);
    }
  }, [fragrance, routeExternalId]);

  const writeReview = useCallback(async () => {
    setReviewPriceValue(priceVoteToScore(communityPriceVote));
    setReviewDialogOpen(true);
  }, [communityPriceVote]);

  const submitReportFragrance = useCallback(async () => {
    const ext = String(fragrance?.externalId ?? "").trim();
    const isCommunity = String(fragrance?.source ?? "").toUpperCase() === "COMMUNITY";
    if (!isCommunity || !ext) return;
    setReportSubmitting(true);
    try {
      await reportCommunityFragrance(ext, {
        reason: reportFragranceReason,
        details: reportFragranceDetails.trim() || null,
      });
      setReportFragranceDialogOpen(false);
      setNoticeTitle("Report submitted");
      setNotice("Thanks. Our moderators will review this fragrance.");
    } catch (e: any) {
      setNoticeTitle("Report failed");
      setNotice(e?.message || "Could not submit fragrance report.");
    } finally {
      setReportSubmitting(false);
    }
  }, [fragrance?.externalId, fragrance?.source, reportFragranceDetails, reportFragranceReason]);

  const buyDisabled = !fragrance?.purchaseUrl;

  const accordBars = useMemo(() => {
    if (!accordsPercent) return null;

    const entries = Object.entries(accordsPercent)
      .map(([k, v]) => {
        const key = String(k).trim();
        if (!key) return null;

        if (typeof v === "number" && Number.isFinite(v)) {
          const n = v > 1 ? v / 100 : v;
          return { name: key, value01: clamp01(n), labelRight: `${Math.round(clamp01(n) * 100)}%` };
        }

        const lv = normalizeLabel(v);
        const map: Record<string, number> = {
          dominant: 0.92,
          prominent: 0.75,
          moderate: 0.55,
          low: 0.3,
          subtle: 0.18,
          light: 0.18,
          faint: 0.14,
        };
        const n = map[lv] ?? 0;
        return { name: key, value01: n, labelRight: String(v) };
      })
      .filter(Boolean) as Array<{ name: string; value01: number; labelRight: string }>;

    entries.sort((a, b) => b.value01 - a.value01);
    return entries;
  }, [accordsPercent]);

  const headerMeta = useMemo(() => {
    const year = fragrance?.year ? String(fragrance.year) : null;
    const gender = fragrance?.gender ? String(fragrance.gender) : null;
    return { year, gender };
  }, [fragrance?.year, fragrance?.gender]);
  const createdByUsername = useMemo(() => {
    const raw = String((fragrance as any)?.createdByUsername ?? "").trim();
    return raw ? raw.replace(/^@+/, "") : "";
  }, [fragrance]);
  

  const stateHasRichDetails = useMemo(() => {
    if (!stateFragrance) return false;
    const notes = normalizeNotes((stateFragrance as any).notes);
    const hasAccordBars =
      stateFragrance.mainAccordsPercentage &&
      typeof stateFragrance.mainAccordsPercentage === "object" &&
      Object.keys(stateFragrance.mainAccordsPercentage).length > 0;

    return (
      notes.top.length > 0 ||
      notes.middle.length > 0 ||
      notes.base.length > 0 ||
      (stateFragrance.mainAccords?.length ?? 0) > 0 ||
      (stateFragrance.generalNotes?.length ?? 0) > 0 ||
      (stateFragrance.seasonRanking?.length ?? 0) > 0 ||
      (stateFragrance.occasionRanking?.length ?? 0) > 0 ||
      Boolean(hasAccordBars)
    );
  }, [stateFragrance]);

  const showSkeleton = isLoading && !loaded && (!stateFragrance || !stateHasRichDetails);

  const ratingValue = useMemo(() => {
    const candidates = [
      (fragrance as any)?.rating,
      (fragrance as any)?.ratingValue,
      (fragrance as any)?.rating_score,
      (fragrance as any)?.score,
    ];
    const raw = candidates.find((v) => v !== null && v !== undefined && String(v).trim() !== "");
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [fragrance]);

  const ratingCount = useMemo(() => {
    const n = Number((fragrance as any)?.ratingCount ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }, [fragrance]);
  const currentUserRating = useMemo(() => {
    const n = Number((fragrance as any)?.userRating ?? 0);
    return normalizeHalfStar(n);
  }, [fragrance]);

  useEffect(() => {
    if (!fragrance) {
      setRatingState(null);
      return;
    }
    setRatingState({
      average: ratingValue ?? 0,
      count: ratingCount,
      userRating: currentUserRating,
    });
  }, [fragrance, ratingValue, ratingCount, currentUserRating]);

  const onRateFragrance = useCallback(async (stars: number) => {
    const normalizedStars = normalizeHalfStar(stars);
    if (normalizedStars === null) return;
    const normalizedSource = String(fragrance?.source ?? inferPreferredSource(routeExternalId || "") ?? "FRAGELLA")
      .trim()
      .toUpperCase();
    const source = normalizedSource === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const externalFromFragrance = String(fragrance?.externalId ?? "").trim();
    const externalFromRoute = String(routeExternalId ?? "").trim();
    let resolvedExternal = externalFromFragrance || (!isSyntheticRouteId(externalFromRoute) ? externalFromRoute : "");
    if ((!resolvedExternal || isSyntheticRouteId(resolvedExternal)) && source === "FRAGELLA") {
      const computed = computeFragellaExternalId(
        String(fragrance?.brand ?? ""),
        String(fragrance?.name ?? ""),
        (fragrance as any)?.year ?? null
      );
      if (hasUsableExternalId(computed)) {
        resolvedExternal = computed;
      }
    }
    if (!resolvedExternal || isSyntheticRouteId(resolvedExternal)) {
      setNoticeTitle("Rating");
      setNotice("Could not resolve a stable fragrance ID for rating.");
      return;
    }
    setRatingBusy(true);
    try {
      const summary = await rateFragrance({
        source,
        externalId: resolvedExternal,
        rating: normalizedStars,
      });
      setRatingState({
        average: Number(summary.average ?? 0),
        count: Number(summary.count ?? 0),
        userRating: summary.userRating ?? normalizedStars,
      });
    } catch (e: any) {
      setNoticeTitle("Rating");
      setNotice(e?.message || "Failed to submit rating.");
    } finally {
      setRatingBusy(false);
    }
  }, [fragrance, routeExternalId]);
  const isCommunityFragrance = String(fragrance?.source ?? "").toUpperCase() === "COMMUNITY";
  const voteSource = isCommunityFragrance ? "COMMUNITY" : "FRAGELLA";
  const voteExternalId = useMemo(() => {
    if (isCreateMode) return "";
    const externalFromFragrance = String(fragrance?.externalId ?? "").trim();
    const externalFromRoute = String(routeExternalId ?? "").trim();
    let resolved = externalFromFragrance || (!isSyntheticRouteId(externalFromRoute) ? externalFromRoute : "");
    if ((!resolved || isSyntheticRouteId(resolved)) && voteSource === "FRAGELLA") {
      const computed = computeFragellaExternalId(
        String(fragrance?.brand ?? ""),
        String(fragrance?.name ?? ""),
        (fragrance as any)?.year ?? null
      );
      if (hasUsableExternalId(computed)) {
        resolved = computed;
      }
    }
    return hasUsableExternalId(resolved) ? resolved : "";
  }, [fragrance, isCreateMode, routeExternalId, voteSource]);
  const canVoteFragrance = Boolean(voteExternalId);
  const inCollection = useMemo(() => {
    const key = collectionKey(voteSource, voteExternalId);
    return key ? viewerCollectionKeys.has(key) : false;
  }, [viewerCollectionKeys, voteSource, voteExternalId]);
  const ratingExternalId = useMemo(() => {
    const normalizedSource = String(fragrance?.source ?? inferPreferredSource(routeExternalId || "") ?? "FRAGELLA")
      .trim()
      .toUpperCase();
    const source = normalizedSource === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const externalFromFragrance = String(fragrance?.externalId ?? "").trim();
    const externalFromRoute = String(routeExternalId ?? "").trim();
    let resolved = externalFromFragrance || (!isSyntheticRouteId(externalFromRoute) ? externalFromRoute : "");
    if ((!resolved || isSyntheticRouteId(resolved)) && source === "FRAGELLA") {
      const computed = computeFragellaExternalId(
        String(fragrance?.brand ?? ""),
        String(fragrance?.name ?? ""),
        (fragrance as any)?.year ?? null
      );
      if (hasUsableExternalId(computed)) {
        resolved = computed;
      }
    }
    return hasUsableExternalId(resolved) ? resolved : "";
  }, [fragrance, routeExternalId]);

  useEffect(() => {
    if (!ratingExternalId || !fragrance) return;
    const source = String(fragrance?.source ?? "").toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    let cancelled = false;
    getFragranceRatingSummary({ source, externalId: ratingExternalId })
      .then((summary) => {
        if (cancelled) return;
        setRatingState((prev) => ({
          average: Number(summary.average ?? 0),
          count: Number(summary.count ?? 0),
          userRating: summary.userRating ?? prev?.userRating ?? null,
        }));
      })
      .catch(() => {
        if (cancelled) return;
      });
    return () => {
      cancelled = true;
    };
  }, [fragrance, ratingExternalId]);
  useEffect(() => {
    if (!canVoteFragrance || !voteExternalId) {
      setCommunityVoteSummary(null);
      communityVoteHydratedExternalIdRef.current = null;
      return;
    }
    let cancelled = false;
    getFragranceVoteSummary({ source: voteSource, externalId: voteExternalId })
      .then((summary) => {
        if (cancelled) return;
        setCommunityVoteSummary(summary);
        if (communityVoteHydratedExternalIdRef.current !== voteExternalId) {
          const mine = summary?.userVote;
          communityVoteHydratingRef.current = true;
          setCommunityLongevityVote(mine?.longevityScore ?? null);
          setCommunitySillageVote(mine?.sillageScore ?? null);
          setCommunityPriceVote((mine?.pricePerception as PriceVoteValue) ?? null);
          setReviewPriceValue(priceVoteToScore(
            (mine?.pricePerception as PriceVoteValue) ?? null
          ));
          setCommunitySeasonVotes(Array.isArray(mine?.seasonVotes) ? mine.seasonVotes : []);
          setCommunityOccasionVotes(Array.isArray(mine?.occasionVotes) ? mine.occasionVotes : []);
          communityVoteLastSavedRef.current = JSON.stringify({
            longevityScore: mine?.longevityScore ?? null,
            sillageScore: mine?.sillageScore ?? null,
            pricePerception: mine?.pricePerception ?? null,
            seasonVotes: Array.isArray(mine?.seasonVotes) ? mine.seasonVotes : [],
            occasionVotes: Array.isArray(mine?.occasionVotes) ? mine.occasionVotes : [],
          });
          communityVoteHydratedExternalIdRef.current = voteExternalId;
          setTimeout(() => {
            communityVoteHydratingRef.current = false;
          }, 0);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCommunityVoteSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [canVoteFragrance, voteExternalId, voteSource]);

  useEffect(() => {
    if (!canVoteFragrance || !voteExternalId) return;
    if (communityVoteHydratingRef.current) return;

    const payload = {
      longevityScore: communityLongevityVote,
      sillageScore: communitySillageVote,
      pricePerception: communityPriceVote,
      seasonVotes: communitySeasonVotes,
      occasionVotes: communityOccasionVotes,
    };
    const hasAny =
      payload.longevityScore !== null ||
      payload.sillageScore !== null ||
      payload.pricePerception !== null ||
      payload.seasonVotes.length > 0 ||
      payload.occasionVotes.length > 0;
    if (!hasAny) return;

    const serialized = JSON.stringify(payload);
    if (serialized === communityVoteLastSavedRef.current) return;

    if (communityVoteAutoSaveTimerRef.current) {
      clearTimeout(communityVoteAutoSaveTimerRef.current);
    }

    communityVoteAutoSaveTimerRef.current = setTimeout(async () => {
      setCommunityVoteSaving(true);
      try {
        const next = await upsertFragranceVote(
          { source: voteSource, externalId: voteExternalId },
          payload
        );
        communityVoteLastSavedRef.current = JSON.stringify({
          longevityScore: next.userVote?.longevityScore ?? null,
          sillageScore: next.userVote?.sillageScore ?? null,
          pricePerception: next.userVote?.pricePerception ?? null,
          seasonVotes: next.userVote?.seasonVotes ?? [],
          occasionVotes: next.userVote?.occasionVotes ?? [],
        });
        setCommunityVoteSummary(next);
      } catch (e: any) {
        setNoticeTitle("Community vote");
        setNotice(e?.message || "Failed to submit vote.");
      } finally {
        setCommunityVoteSaving(false);
      }
    }, 450);

    return () => {
      if (communityVoteAutoSaveTimerRef.current) {
        clearTimeout(communityVoteAutoSaveTimerRef.current);
      }
    };
  }, [
    communityLongevityVote,
    communityOccasionVotes,
    communityPriceVote,
    communitySeasonVotes,
    communitySillageVote,
    canVoteFragrance,
    voteExternalId,
    voteSource,
  ]);

  const communitySeasonStarsByKey = useMemo(() => {
    const out: Record<string, number> = {};
    communitySeasonVotes.forEach((key) => {
      const normalized = toVoteKey(key);
      out[normalized] = (out[normalized] ?? 0) + 1;
    });
    return out;
  }, [communitySeasonVotes]);
  const communityOccasionStarsByKey = useMemo(() => {
    const out: Record<string, number> = {};
    communityOccasionVotes.forEach((key) => {
      const normalized = toVoteKey(key);
      out[normalized] = (out[normalized] ?? 0) + 1;
    });
    return out;
  }, [communityOccasionVotes]);

  const reviewScorecard = useMemo(() => {
    const performance: Array<{ label: string; value: number }> = [];
    if (communityLongevityVote !== null) performance.push({ label: "Longevity", value: communityLongevityVote });
    if (communitySillageVote !== null) performance.push({ label: "Sillage", value: communitySillageVote });
    const priceScore = reviewPriceValue;
    const priceLabel = reviewPriceLabel(reviewPriceValue);

    const season = Object.entries(communitySeasonStarsByKey)
      .filter(([, stars]) => Number(stars) > 0)
      .map(([key, stars]) => ({ label: fromVoteKey(key), value: Number(stars) }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    const occasion = Object.entries(communityOccasionStarsByKey)
      .filter(([, stars]) => Number(stars) > 0)
      .map(([key, stars]) => ({ label: fromVoteKey(key), value: Number(stars) }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    return { performance, season, occasion, priceScore, priceLabel };
  }, [
    communityLongevityVote,
    communityOccasionStarsByKey,
    communitySeasonStarsByKey,
    communitySillageVote,
    reviewPriceValue,
  ]);

  const submissionHandler = useCallback(async () => {
    const normalizedSource = String(fragrance?.source ?? inferPreferredSource(routeExternalId || "") ?? "FRAGELLA")
      .trim()
      .toUpperCase();
    const source = normalizedSource === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const externalFromFragrance = String(fragrance?.externalId ?? "").trim();
    const externalFromRoute = String(routeExternalId ?? "").trim();
    let resolvedExternal = externalFromFragrance || (!isSyntheticRouteId(externalFromRoute) ? externalFromRoute : "");
    const name = String(fragrance?.name ?? "").trim();
    const brand = String(fragrance?.brand ?? "").trim();
    const rating = Number(ratingState?.userRating ?? 0);
    const reviewRating = Math.round(rating);
    const excerpt = reviewBody.trim();

    if ((!resolvedExternal || isSyntheticRouteId(resolvedExternal)) && source === "FRAGELLA") {
      const computed = computeFragellaExternalId(brand, name, (fragrance as any)?.year ?? null);
      if (hasUsableExternalId(computed)) {
        resolvedExternal = computed;
      }
    }

    if ((!resolvedExternal || isSyntheticRouteId(resolvedExternal)) && name) {
      try {
        const query = [brand, name].filter(Boolean).join(" ").trim() || name;
        const candidates = source === "COMMUNITY"
          ? await searchCommunityFragrances({ q: query, limit: 30 })
          : await searchFragrances({ q: query, limit: 30, persist: true });
        const targetName = normalizeForMatch(name);
        const targetBrand = normalizeForMatch(brand);
        const exact = candidates.find((c) =>
          normalizeForMatch(c.name) === targetName &&
          normalizeForMatch(c.brand) === targetBrand &&
          hasUsableExternalId(c.externalId)
        );
        const byName = candidates.find((c) =>
          normalizeForMatch(c.name) === targetName && hasUsableExternalId(c.externalId)
        );
        resolvedExternal = String((exact ?? byName)?.externalId ?? "").trim();
      } catch {
        // keep fallback path below
      }
    }

    if (!resolvedExternal || isSyntheticRouteId(resolvedExternal)) {
      setNoticeTitle("Review");
      setNotice("Could not resolve a stable fragrance ID for review.");
      return;
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setNoticeTitle("Review");
      setNotice("Please add your star rating first.");
      return;
    }
    if (!excerpt) {
      setNoticeTitle("Review");
      setNotice("Please write a short review before submitting.");
      return;
    }

    setReviewSubmitting(true);
    try {
      const performancePayload = Object.fromEntries(reviewScorecard.performance.map((it) => [it.label.toLowerCase(), it.value]));
      if (reviewScorecard.priceScore !== null) {
        performancePayload.price_perception = reviewScorecard.priceScore;
      }
      await submitReview({
        source,
        externalId: resolvedExternal,
        fragranceName: name || "Fragrance",
        fragranceBrand: fragrance?.brand ?? null,
        fragranceImageUrl: fragrance?.imageUrl ?? null,
        rating: reviewRating,
        excerpt,
        performance: performancePayload,
        season: Object.fromEntries(reviewScorecard.season.map((it) => [it.label.toLowerCase(), it.value])),
        occasion: Object.fromEntries(reviewScorecard.occasion.map((it) => [it.label.toLowerCase(), it.value])),
      });
      setReviewDialogOpen(false);
      setReviewBody("");
      setNoticeTitle("Review");
      setNotice("Review submitted to feed.");
    } catch (e: any) {
      setNoticeTitle("Review");
      setNotice(e?.message || "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  }, [fragrance, ratingState?.userRating, reviewBody, reviewScorecard, routeExternalId]);

  const onVoteSeason = useCallback((name: string, stars: number) => {
    const key = toVoteKey(name);
    const next: string[] = [];
    Object.entries(communitySeasonStarsByKey).forEach(([k, v]) => {
      if (k === key) return;
      for (let i = 0; i < Math.min(5, Math.max(0, v)); i++) next.push(k);
    });
    for (let i = 0; i < Math.min(5, Math.max(0, stars)); i++) next.push(key);
    setCommunitySeasonVotes(next);
  }, [communitySeasonStarsByKey]);

  const onVoteOccasion = useCallback((name: string, stars: number) => {
    const key = toVoteKey(name);
    const next: string[] = [];
    Object.entries(communityOccasionStarsByKey).forEach(([k, v]) => {
      if (k === key) return;
      for (let i = 0; i < Math.min(5, Math.max(0, v)); i++) next.push(k);
    });
    for (let i = 0; i < Math.min(5, Math.max(0, stars)); i++) next.push(key);
    setCommunityOccasionVotes(next);
  }, [communityOccasionStarsByKey]);

  const isOwnCommunityFragrance = Boolean(
    isCommunityFragrance &&
    createdByUsername &&
    (
      (viewerUser?.id && String((fragrance as any)?.createdByUserId ?? "") === viewerUser.id) ||
      (viewerUser?.username && viewerUser.username.toLowerCase() === createdByUsername.toLowerCase())
    )
  );
  const canRateCreator = Boolean(
    isCommunityFragrance &&
    createdByUsername &&
    !isOwnCommunityFragrance
  );
  const canManageCommunity = Boolean(
    isCommunityFragrance &&
    fragrance &&
    (
      (viewerUser?.id && String((fragrance as any)?.createdByUserId ?? "") === viewerUser.id) ||
      (viewerUser?.username && createdByUsername && viewerUser.username.toLowerCase() === createdByUsername.toLowerCase())
    )
  );
  const isEditingForm = isCreateMode || (canManageCommunity && editingCommunity);

  const onDeleteCommunity = useCallback(async () => {
    if (!canManageCommunity || !fragrance?.externalId) return;
    setDeletingCommunity(true);
    try {
      await deleteCommunityFragrance(fragrance.externalId);
      navigate("/profile");
    } catch (e: any) {
      setNoticeTitle("Delete");
      setNotice(e?.message || "Failed to delete fragrance.");
    } finally {
      setDeletingCommunity(false);
      setConfirmDeleteOpen(false);
    }
  }, [canManageCommunity, fragrance?.externalId, navigate]);

  useEffect(() => {
    if (!isCommunityFragrance || !createdByUsername) {
      setCreatorRatingState(null);
      return;
    }
    let cancelled = false;
    getCreatorRatingSummary(createdByUsername)
      .then((summary) => {
        if (cancelled) return;
        setCreatorRatingState({
          average: Number(summary.average ?? 0),
          count: Number(summary.count ?? 0),
          userRating: summary.userRating ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setCreatorRatingState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isCommunityFragrance, createdByUsername]);

  const onRateCreator = useCallback(async (stars: number) => {
    if (!canRateCreator || !createdByUsername || stars < 1 || stars > 5) return;
    setCreatorRatingBusy(true);
    try {
      const summary = await rateCreator(createdByUsername, stars);
      setCreatorRatingState({
        average: Number(summary.average ?? 0),
        count: Number(summary.count ?? 0),
        userRating: summary.userRating ?? stars,
      });
    } catch (e: any) {
      setNoticeTitle("Creator rating");
      setNotice(e?.message || "Failed to submit creator rating.");
    } finally {
      setCreatorRatingBusy(false);
    }
  }, [canRateCreator, createdByUsername]);

  const shownLongevityLabel = isEditingForm
    ? (draftLongevity > 0 ? LONGEVITY_EDIT_LABELS[draftLongevity] : "—")
    : (longevityLabel ? String(longevityLabel) : "—");
  const shownSillageLabel = isEditingForm
    ? (draftSillage > 0 ? SILLAGE_EDIT_LABELS[draftSillage] : "—")
    : (sillageLabel ? String(sillageLabel) : "—");
  const shownConfidenceLabel = isEditingForm
    ? (draftConfidence > 0 ? SIGNAL_EDIT_LABELS[draftConfidence] : "—")
    : (confidenceLabel ? String(confidenceLabel) : "—");
  const shownPopularityLabel = isEditingForm
    ? (draftPopularity > 0 ? SIGNAL_EDIT_LABELS[draftPopularity] : "—")
    : (popularityLabel ? String(popularityLabel) : "—");
  const shownVisibilityLabel = isEditingForm ? (draftVisibility === "PUBLIC" ? "Public" : "Private")
    : (String((fragrance as any)?.visibility ?? "PRIVATE").toUpperCase() === "PUBLIC" ? "Public" : "Private");

  const shownLongevity01 = isEditingForm ? clamp01(draftLongevity / 5) : longevity01;
  const shownSillage01 = isEditingForm ? clamp01(draftSillage / 5) : sillage01;
  const hideComputedVotingSectionsWhileEditingCommunity = isCommunityFragrance && isEditingForm;
  const shownConfidence01 = isEditingForm ? clamp01(draftConfidence / 4) : confidence01;
  const shownPopularity01 = isEditingForm ? clamp01(draftPopularity / 4) : popularity01;
  const canSaveEdit = draftBrand.trim().length > 0 && draftName.trim().length > 0 && !uploadingDraftImage;

  function addDraftAccord() {
    const cleaned = draftAccordInput.trim();
    if (!cleaned) return;
    setDraftAccords((prev) => {
      if (prev.some((x) => x.name.toLowerCase() === cleaned.toLowerCase()) || prev.length >= 20) return prev;
      return [...prev, { name: cleaned, strength: 1 }];
    });
    setDraftAccordInput("");
  }

  const onPickDraftImage = useCallback((file: File | null) => {
    if (!file) return;
    const validationError = validateImageUploadFile(file);
    if (validationError) {
      setDraftImageError(validationError);
      return;
    }
    setDraftImageError(null);
    setDraftImageLabel(file.name || "Uploaded image");
    setDraftImageFile(file);
    const preview = URL.createObjectURL(file);
    setDraftImageUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return preview;
    });
  }, []);

  function addDraftNote(note: NoteDictionaryItem) {
    const mapped: Note = { id: note.id, name: note.name, imageUrl: note.imageUrl };
    const dedupe = (arr: Note[]) => {
      const seen = new Set<string>();
      return arr.filter((n) => {
        const k = `${n.id ?? ""}:${n.name.toLowerCase()}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 20);
    };
    if (draftStage === "TOP") setDraftTopNotes((prev) => dedupe([...prev, mapped]));
    if (draftStage === "MIDDLE") setDraftMiddleNotes((prev) => dedupe([...prev, mapped]));
    if (draftStage === "BASE") setDraftBaseNotes((prev) => dedupe([...prev, mapped]));
    const stageLabel = draftStage === "TOP" ? "Top notes" : draftStage === "MIDDLE" ? "Middle notes" : "Base notes";
    setDraftNoteAddedHint(`Added to ${stageLabel}`);
  }

  function addCustomDraftNote() {
    const cleaned = draftNoteSearch.trim();
    if (!cleaned) return;
    addDraftNote({
      id: `custom-${draftStage.toLowerCase()}-${Date.now()}`,
      name: cleaned,
      imageUrl: null,
      usageCount: null,
    });
    setDraftNoteSearch("");
    setDraftNoteResults([]);
  }

  const saveInPlaceEdit = useCallback(async () => {
    if (!fragrance?.externalId) return;
    if (!isCreateMode && !canManageCommunity) return;
    const nextYear = draftYear.trim();
    const normalizedPurchaseUrl = normalizePurchaseUrlForSubmit(draftPurchaseUrl);
    if (nextYear && !/^\d{4}$/.test(nextYear)) {
      setNoticeTitle("Edit");
      setNotice("Year must be a 4-digit value.");
      return;
    }
    setSavingEdit(true);
    try {
      let uploadedImageObjectKey = draftImageObjectKey;
      let uploadedImageUrl = draftImageUrl.trim() || null;
      if (draftImageFile) {
        setUploadingDraftImage(true);
        const uploaded = await uploadImageFile(draftImageFile, "FRAGRANCE");
        uploadedImageObjectKey = uploaded.objectKey;
        uploadedImageUrl = uploaded.publicUrl;
      }
      const mainAccords = draftAccords.map((x) => x.name);
      const mainAccordsPercentage = draftAccords.reduce<Record<string, string>>((acc, it) => {
        acc[it.name] = ACCORD_STRENGTH_LABELS[it.strength] ?? "Moderate";
        return acc;
      }, {});

      const toIdList = (items: Note[]) => items
        .map((n) => String(n.id ?? "").trim())
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
      const toCustomNameList = (items: Note[]) => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const n of items) {
          const id = String(n.id ?? "").trim();
          if (/^[0-9a-f-]{36}$/i.test(id)) continue;
          const name = String(n.name ?? "").trim();
          if (!name) continue;
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(name);
          if (out.length >= 20) break;
        }
        return out;
      };

      const body = {
        name: draftName.trim(),
        brand: draftBrand.trim(),
        year: nextYear || null,
        imageObjectKey: uploadedImageObjectKey || null,
        imageUrl: uploadedImageUrl,
        purchaseUrl: normalizedPurchaseUrl,
        concentration: draftConcentration.trim() || null,
        longevityScore: null,
        sillageScore: null,
        confidence: null,
        popularity: null,
        mainAccords,
        mainAccordsPercentage,
        visibility: draftVisibility,
        topNoteIds: toIdList(draftTopNotes),
        middleNoteIds: toIdList(draftMiddleNotes),
        baseNoteIds: toIdList(draftBaseNotes),
        topNoteNames: toCustomNameList(draftTopNotes),
        middleNoteNames: toCustomNameList(draftMiddleNotes),
        baseNoteNames: toCustomNameList(draftBaseNotes),
      };
      const saved = isCreateMode
        ? await createCommunityFragrance(body)
        : await updateCommunityFragrance(fragrance.externalId, body);
      setLoaded(saved);
      if (isCreateMode) {
        const nextId = String(saved.externalId ?? "").trim();
        if (nextId) {
          navigate(`/fragrances/${encodeURIComponent(nextId)}?source=COMMUNITY`, {
            replace: true,
            state: {
              fragrance: saved,
              from,
            },
          });
        }
      } else {
        setEditingCommunity(false);
      }
      setDraftImageFile(null);
      setDraftImageError(null);
    } catch (e: any) {
      setNoticeTitle(isCreateMode ? "Publish" : "Edit");
      setNotice(e?.message || (isCreateMode ? "Failed to publish fragrance." : "Failed to update fragrance."));
    } finally {
      setUploadingDraftImage(false);
      setSavingEdit(false);
    }
  }, [
    isCreateMode,
    canManageCommunity,
    fragrance,
    from,
    navigate,
    draftBrand,
    draftName,
    draftYear,
    draftConcentration,
    draftImageUrl,
    draftImageObjectKey,
    draftImageFile,
    draftPurchaseUrl,
    draftAccords,
    draftLongevity,
    draftSillage,
    draftConfidence,
    draftPopularity,
    draftVisibility,
    draftTopNotes,
    draftMiddleNotes,
    draftBaseNotes,
  ]);

  return (
    <div className="min-h-screen overflow-x-hidden text-white stacta-fade-rise">
      <div className="mx-auto max-w-6xl overflow-x-hidden px-4 pb-28 sm:pb-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/15 bg-black/30 p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-amber-200/80">Fragrance Intelligence</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{isCreateMode ? "Create Community Fragrance" : "Fragrance"}</h1>
            <p className="mt-1 text-sm text-white/65">{isCreateMode ? "Build it with full details, then publish it." : "Details + add to your collection."}</p>
          </div>
          <div className="flex flex-wrap items-start gap-2 sm:items-center">
            {canManageCommunity && !isCreateMode ? (
              <Button
                variant="secondary"
                className="h-10 rounded-xl border border-cyan-300/30 bg-cyan-400/12 text-cyan-100 hover:bg-cyan-400/20"
                onClick={() => setEditingCommunity((v) => !v)}
              >
                {editingCommunity ? "Editing" : "Edit"}
              </Button>
            ) : null}
            {isEditingForm ? (
              <Button className="h-10 rounded-xl px-5" onClick={saveInPlaceEdit} disabled={savingEdit || uploadingDraftImage || !canSaveEdit}>
                {savingEdit || uploadingDraftImage ? (isCreateMode ? "Publishing..." : "Saving...") : (isCreateMode ? "Publish" : "Save Changes")}
              </Button>
            ) : null}
            {isEditingForm ? (
              <Button
                variant="secondary"
                className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                onClick={() => {
                  if (isCreateMode) {
                    if (from?.pathname) {
                      navigate(`${from.pathname}${from.search ?? ""}`);
                      return;
                    }
                    navigate("/search");
                    return;
                  }
                  setEditingCommunity(false);
                }}
                disabled={savingEdit}
              >
                Cancel
              </Button>
            ) : null}
            {canManageCommunity && !isCreateMode ? (
              <Button
                variant="secondary"
                className="h-10 rounded-xl border border-red-300/30 bg-red-400/12 text-red-100 hover:bg-red-400/20"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deletingCommunity}
              >
                {deletingCommunity ? "Deleting..." : "Delete"}
              </Button>
            ) : null}
            {isCommunityFragrance && createdByUsername && !isOwnCommunityFragrance ? (
              <div className="w-full sm:w-auto sm:mr-2">
                <div className="flex flex-wrap items-center justify-start gap-2 text-xs">
                  <span className="font-medium text-white/85">Stacta rep</span>
                  <AverageStars value={creatorRatingState?.average ?? 0} />
                  <span className="text-white/70">
                    {creatorRatingState && creatorRatingState.count > 0
                      ? `${creatorRatingState.average.toFixed(2)} • ${creatorRatingState.count}`
                      : "No ratings"}
                  </span>
                </div>
                {canRateCreator ? (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-white/55">Rate stacta rep</span>
                    <div className="inline-flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const n = i + 1;
                        const lit = n <= (creatorRatingState?.userRating ?? 0);
                        return (
                          <button
                            key={`creator-rate-${n}`}
                            type="button"
                            className={cx(
                              "grid h-7 w-7 place-items-center rounded-md text-base leading-none transition touch-manipulation",
                              lit ? "text-amber-200" : "text-white/30 hover:text-white/70"
                            )}
                            onClick={() => onRateCreator(n)}
                            disabled={creatorRatingBusy}
                            aria-label={`Rate stacta rep ${n} star${n > 1 ? "s" : ""}`}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-white/55">
                    {viewerUser?.username && createdByUsername && viewerUser.username.toLowerCase() === createdByUsername.toLowerCase()
                      ? "You can’t rate yourself"
                      : "Sign in to rate creator"}
                  </div>
                )}
              </div>
            ) : null}
            <Button
              variant="secondary"
              className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
              onClick={() => {
                if (from?.pathname) {
                  navigate(`${from.pathname}${from.search ?? ""}`);
                  return;
                }
                navigate(-1);
              }}
            >
              Back
            </Button>
          </div>
        </div>

        <div className="relative overflow-x-hidden rounded-3xl border border-white/15 bg-white/6 p-4 sm:p-6">
          {!isCreateMode && isCommunityFragrance && !canManageCommunity ? (
            <div className="absolute left-4 right-4 top-4 z-10 sm:left-auto sm:right-6 sm:top-6">
              <Button
                type="button"
                variant="secondary"
                className="h-8 w-full rounded-xl border border-red-300/25 bg-transparent px-3 text-xs text-red-100 hover:bg-red-400/12 sm:w-auto"
                onClick={() => {
                  setReportFragranceReason("INAPPROPRIATE");
                  setReportFragranceDetails("");
                  setReportFragranceDialogOpen(true);
                }}
              >
                Report fragrance
              </Button>
            </div>
          ) : null}
          {showSkeleton ? (
            <div className="rounded-2xl border border-white/15 bg-black/25 p-8">
              <LoadingSpinner label="Fetching fragrance details..." />
            </div>
          ) : !fragrance ? (
            <div className="rounded-2xl border border-white/15 bg-black/25 p-4">
              <div className="text-sm font-semibold">{loadError ? "Couldn’t load" : "Open from Search"}</div>
              <div className="mt-2 text-sm text-white/70">
                {loadError
                  ? loadError
                  : "There’s no cached state for this route yet. Open this page by clicking a fragrance from Search."}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="h-10 rounded-xl px-5" onClick={() => navigate("/search")}>
                  Go to Search
                </Button>

                {routeExternalId ? (
                  <Button
                    variant="secondary"
                    className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
                    onClick={() => {
                      forceRefreshRef.current = true;
                      setRetryTick((x) => x + 1);
                    }}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid min-w-0 gap-6 overflow-x-hidden lg:grid-cols-[380px_1fr] lg:items-start">
              <div className="min-w-0 overflow-hidden rounded-3xl border border-white/15 bg-black/25 lg:sticky ">
                <div className="p-4">
                  <div className="mb-4 lg:hidden">
                    {isEditingForm ? (
                      <div className="space-y-2">
                        <input value={draftBrand} onChange={(e) => setDraftBrand(e.target.value)} placeholder="Brand" className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none" />
                        <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Name" className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-lg font-semibold text-white outline-none" />
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-white/60">{fragrance.brand || "—"}</div>
                        <div className="mt-1 text-2xl font-semibold tracking-tight">{fragrance.name || "—"}</div>
                      </>
                    )}
                    {isCommunityFragrance && isEditingForm ? (
                      <div className="mt-2 rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-[11px] text-amber-100/95">
                        Draft tip: keep this private while you are still building it. You can switch between private and public anytime.
                      </div>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {isEditingForm ? (
                        <ConcentrationDropdown
                          value={draftConcentration}
                          onChange={setDraftConcentration}
                          options={CONCENTRATION_OPTIONS}
                          className="w-full sm:w-auto"
                        />
                      ) : oilType ? (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/85">
                          {oilType}
                        </span>
                      ) : null}

                        <div className="text-sm text-white/60">
                          {isEditingForm ? (
                            <input
                              value={draftYear}
                              onChange={(e) => setDraftYear(e.target.value)}
                              placeholder="Year"
                              className="h-8 w-24 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white outline-none"
                            />
                          ) : headerMeta.year || headerMeta.gender ? (
                            <span className="inline-flex items-center gap-2">
                              {headerMeta.year ? (
                                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-white font-semibold tabular-nums">
                                  {headerMeta.year}
                                </span>
                              ) : null}
                              {headerMeta.gender ? <span>{headerMeta.gender}</span> : null}
                            </span>
                          ) : (
                            "—"
                          )}
                        </div>
                        {isCommunityFragrance ? (
                          isEditingForm ? (
                            <div className="flex w-full min-w-0 items-center justify-between gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 sm:w-auto sm:justify-start">
                              <span className="text-[11px] text-white/65">Visibility</span>
                              <Switch
                                checked={draftVisibility === "PUBLIC"}
                                onCheckedChange={(checked) => setDraftVisibility(checked ? "PUBLIC" : "PRIVATE")}
                                aria-label="Set fragrance visibility"
                              />
                              <span className="text-[11px] text-cyan-100">{shownVisibilityLabel}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/80">
                              {shownVisibilityLabel}
                            </span>
                          )
                        ) : null}
                        {createdByUsername ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/u/${encodeURIComponent(createdByUsername)}`)}
                            className="inline-flex min-w-0 max-w-full items-center rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100/95 hover:bg-cyan-400/20"
                          >
                            <span className="truncate">Created by @{createdByUsername}</span>
                          </button>
                        ) : null}

                    </div>
                    {isEditingForm ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/85 hover:bg-white/10">
                          Upload image
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => onPickDraftImage(e.target.files?.[0] ?? null)}
                          />
                        </label>
                        <input
                          value={draftImageLabel}
                          readOnly
                          placeholder="No image selected"
                          className="h-8 w-full rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white outline-none sm:w-auto sm:flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/18"
                          onClick={() => {
                            setDraftImageUrl("");
                            setDraftImageObjectKey(null);
                            setDraftImageFile(null);
                            setDraftImageError(null);
                            setDraftImageLabel("");
                          }}
                          disabled={!draftImageUrl.trim() && !draftImageObjectKey && !draftImageFile}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : null}
                    {isEditingForm && draftImageError ? (
                      <div className="mt-2 text-xs text-red-200">{draftImageError}</div>
                    ) : null}
                    {isEditingForm ? (
                      <div className="mt-2">
                        <input
                          value={draftPurchaseUrl}
                          onChange={(e) => setDraftPurchaseUrl(e.target.value)}
                          placeholder="Buy link (optional) e.g. https://shop.com/product"
                          className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/15 bg-black/20">
                      <img
                        src={(isEditingForm ? draftImageUrl : fragrance.imageUrl)?.trim() ? (isEditingForm ? draftImageUrl : fragrance.imageUrl) : FALLBACK_FRAGRANCE_IMG}
                        alt={`${fragrance.brand} ${fragrance.name}`.trim()}
                        className="w-full bg-white/5 object-contain"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.dataset.fallbackApplied === "1") return;
                          img.dataset.fallbackApplied = "1";
                          img.src = FALLBACK_FRAGRANCE_IMG;
                        }}
                      />
                    </div>

                </div>

                <div className="border-t border-white/15 bg-gradient-to-b from-white/8 to-black/10 p-4">
                  {!isCreateMode ? (
                    <div className="rounded-2xl border border-white/12 bg-white/4 p-3">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Quick Actions</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Button
                          variant="secondary"
                          className="h-11 w-full rounded-full border border-[#3EB489]/40 bg-[#3EB489]/14 px-4 text-[13px] font-medium text-[#b0ecd7] hover:bg-[#3EB489]/22"
                          onClick={writeReview}
                        >
                          <span className="inline-flex items-center justify-center gap-1.5 leading-none">
                            <PenSquare className="h-3.5 w-3.5" />
                            <span>Review</span>
                          </span>
                        </Button>
                        <Button
                          className="h-11 w-full rounded-full border border-white/15 bg-white/10 px-4 text-[13px] font-medium text-white hover:bg-white/16"
                          onClick={addToCollection}
                          disabled={addingToCollection || inCollection}
                        >
                          {addingToCollection ? (
                            <span className="inline-flex items-center gap-2">
                              <InlineSpinner />
                              <span>Adding</span>
                            </span>
                          ) : inCollection ? (
                            <span className="inline-flex items-center justify-center gap-1.5 leading-none text-[#9de2ca]">
                              <Check className="h-3.5 w-3.5" />
                              <span>In Collection</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1.5 leading-none">
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Collection</span>
                            </span>
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-11 w-full rounded-full border border-white/15 bg-white/8 px-4 text-[13px] font-medium text-white/90 hover:bg-white/14"
                          disabled={addingToWishlist}
                          onClick={addToWishlist}
                        >
                          {addingToWishlist ? (
                            <span className="inline-flex items-center gap-2">
                              <InlineSpinner />
                              <span>Adding</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1.5 leading-none">
                              <BookmarkPlus className="h-3.5 w-3.5" />
                              <span>Add Wishlist</span>
                            </span>
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-11 w-full rounded-full border border-white/15 bg-white/8 px-4 text-[13px] font-medium text-white/90 hover:bg-white/14 disabled:opacity-50"
                          disabled={buyDisabled}
                          onClick={() => {
                            if (fragrance.purchaseUrl) window.open(fragrance.purchaseUrl, "_blank");
                          }}
                        >
                          <span className="inline-flex items-center justify-center gap-1.5 leading-none">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>Buy</span>
                          </span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-cyan-100/85">
                      Fill out fragrance details and click Publish at the top when ready.
                    </div>
                  )}
                  {!isCreateMode ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
                      <div className="text-[11px] text-white/60">Rating</div>
                      <div className="mt-2 flex flex-col items-center">
                        <AverageStars value={ratingState?.average ?? 0} />
                        <div className="mt-1 text-[12px] font-semibold tabular-nums text-white/85">
                          {ratingState && ratingState.average > 0 ? `${ratingState.average.toFixed(2)}/5` : "—"}
                        </div>
                        <div className="text-[11px] text-white/55">
                          {ratingState && ratingState.count > 0 ? `${ratingState.count} ratings` : "No ratings yet"}
                        </div>
                        <div className="mt-2 text-[11px] text-white/55">Your rating</div>
                        <div className="mt-1">
                          <FragranceHalfStarInput
                            value={ratingState?.userRating ?? null}
                            onSelect={onRateFragrance}
                            disabled={ratingBusy}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-white/60">
                          {ratingState?.userRating ? `${ratingState.userRating.toFixed(1)} / 5` : "Select your rating"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
                      <div className="text-[11px] text-white/60">Price</div>
                      <div className="mt-1 text-sm font-semibold">{fragrance.priceValue ?? fragrance.price ?? "Not listed"}</div>
                      {canVoteFragrance && !isEditingForm ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {REVIEW_PRICE_OPTIONS.map((option) => (
                              <button
                                key={`price-vote-${option.value}`}
                                type="button"
                                className={cx(
                                  "min-h-9 rounded-full border px-3 py-1 text-xs transition touch-manipulation",
                                  reviewPriceToneClasses(option.value, reviewPriceValue === option.value)
                                )}
                                onClick={() => {
                                  const next = reviewPriceValue === option.value ? null : option.value;
                                  setReviewPriceValue(next);
                                  setCommunityPriceVote(reviewPriceToCommunityVote(next));
                                }}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          {communityPriceBars.length ? (
                            <div className="space-y-1">
                              {communityPriceBars.map((row) => (
                                <Bar
                                  key={`price-bar-${row.name}`}
                                  label={row.name}
                                  value01={row.ratio}
                                  rightText={String(Math.round(row.count))}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    </div>
                  ) : null}

                  {!hideComputedVotingSectionsWhileEditingCommunity ? (
                  <div className="mt-6 rounded-2xl border border-white/15 bg-black/20 p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium text-white/80">Performance</div>
                        <div className="mt-1 text-[11px] text-white/45">longevity • sillage • signals</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <Bar
                        label="Longevity"
                        value01={canVoteFragrance && !isEditingForm && communityVoteSummary ? communityLongevity01 : shownLongevity01}
                        rightText={
                          canVoteFragrance && !isEditingForm
                            ? levelLabelFrom01(communityLongevity01, COMMUNITY_LONGEVITY_LEVEL_LABELS)
                            : shownLongevityLabel
                        }
                      />
                      {canVoteFragrance && !isEditingForm ? (
                        <>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={communityLongevityVote ?? 1}
                            onChange={(e) => setCommunityLongevityVote(Number(e.target.value))}
                            className="h-9 w-full cursor-pointer accent-cyan-300 touch-pan-y"
                            aria-label="Community longevity vote"
                          />
                          <div className="mt-1 flex items-center justify-between text-[10px] text-white/45">
                            <span>Fleeting</span>
                            <span>Endless</span>
                          </div>
                          <div className="text-[11px] text-white/55">
                            Your vote: {communityLongevityVote ? COMMUNITY_LONGEVITY_LEVEL_LABELS[communityLongevityVote] : "Not voted"}
                          </div>
                        </>
                      ) : null}
                      <Bar
                        label="Sillage"
                        value01={canVoteFragrance && !isEditingForm && communityVoteSummary ? communitySillage01 : shownSillage01}
                        rightText={
                          canVoteFragrance && !isEditingForm
                            ? levelLabelFrom01(communitySillage01, COMMUNITY_SILLAGE_LEVEL_LABELS)
                            : shownSillageLabel
                        }
                      />
                      {canVoteFragrance && !isEditingForm ? (
                        <>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={communitySillageVote ?? 1}
                            onChange={(e) => setCommunitySillageVote(Number(e.target.value))}
                            className="h-9 w-full cursor-pointer accent-cyan-300 touch-pan-y"
                            aria-label="Community sillage vote"
                          />
                          <div className="mt-1 flex items-center justify-between text-[10px] text-white/45">
                            <span>Skin scent</span>
                            <span>Nuclear</span>
                          </div>
                          <div className="text-[11px] text-white/55">
                            Your vote: {communitySillageVote ? COMMUNITY_SILLAGE_LEVEL_LABELS[communitySillageVote] : "Not voted"}
                          </div>
                        </>
                      ) : null}
                      {!canVoteFragrance ? (
                        <>
                          <Bar
                            label="Confidence"
                            value01={shownConfidence01}
                            rightText={shownConfidenceLabel}
                          />
                          <Bar
                            label="Popularity"
                            value01={shownPopularity01}
                            rightText={shownPopularityLabel}
                          />
                        </>
                      ) : null}
                      {canVoteFragrance && !isEditingForm ? (
                        <div className="min-h-5 text-xs text-white/70">
                          {communityVoteSaving ? (
                            <span className="inline-flex items-center gap-2">
                              <InlineSpinner />
                              <span>Saving votes…</span>
                            </span>
                          ) : <span className="text-white/45">Votes save automatically.</span>}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 text-xs text-white/45">
                      {canVoteFragrance
                        ? (isCommunityFragrance
                          ? "Community bars are calculated from member votes."
                          : "Bars blend Fragella baseline with community votes.")
                        : "Confidence and popularity are categorical labels."}
                    </div>
                  </div>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 space-y-5 [&>*]:min-w-0">
                <div className="hidden lg:block">
                  {isEditingForm ? (
                    <div className="space-y-2">
                      <input value={draftBrand} onChange={(e) => setDraftBrand(e.target.value)} placeholder="Brand" className="h-9 w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none" />
                      <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Name" className="h-10 w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-3 text-lg font-semibold text-white outline-none" />
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-white/60">{fragrance.brand || "—"}</div>
                      <div className="mt-1 text-2xl font-semibold tracking-tight">{fragrance.name || "—"}</div>
                    </>
                  )}
                  {isCommunityFragrance && isEditingForm ? (
                    <div className="mt-2 max-w-2xl rounded-xl border border-amber-200/25 bg-amber-200/10 px-3 py-2 text-[11px] text-amber-100/95">
                      Draft tip: keep this private while you are still building it. You can switch between private and public anytime.
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {isEditingForm ? (
                      <ConcentrationDropdown
                        value={draftConcentration}
                        onChange={setDraftConcentration}
                        options={CONCENTRATION_OPTIONS}
                        className="w-full max-w-md sm:w-auto"
                      />
                    ) : oilType ? (
                      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/85">
                        {oilType}
                      </span>
                    ) : null}

                      <div className="text-sm text-white/60">
                        {isEditingForm ? (
                          <input
                            value={draftYear}
                            onChange={(e) => setDraftYear(e.target.value)}
                            placeholder="Year"
                            className="h-8 w-24 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white outline-none"
                          />
                        ) : headerMeta.year || headerMeta.gender ? (
                          <span className="inline-flex items-center gap-2">
                            {headerMeta.year ? (
                              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-white font-semibold tabular-nums">
                                {headerMeta.year}
                              </span>
                            ) : null}
                            {headerMeta.gender ? <span>{headerMeta.gender}</span> : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </div>
                      {isCommunityFragrance ? (
                        isEditingForm ? (
                          <div className="flex w-full min-w-0 items-center justify-between gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 sm:w-auto sm:justify-start">
                            <span className="text-[11px] text-white/65">Visibility</span>
                            <Switch
                              checked={draftVisibility === "PUBLIC"}
                              onCheckedChange={(checked) => setDraftVisibility(checked ? "PUBLIC" : "PRIVATE")}
                              aria-label="Set fragrance visibility"
                            />
                            <span className="text-[11px] text-cyan-100">{shownVisibilityLabel}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/80">
                            {shownVisibilityLabel}
                          </span>
                        )
                      ) : null}
                      {createdByUsername ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/u/${encodeURIComponent(createdByUsername)}`)}
                          className="inline-flex min-w-0 max-w-full items-center rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100/95 hover:bg-cyan-400/20"
                        >
                          <span className="truncate">Created by @{createdByUsername}</span>
                        </button>
                      ) : null}

                  </div>
                  {isEditingForm ? (
                    <div className="mt-2 flex max-w-2xl flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/85 hover:bg-white/10">
                        Upload image
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => onPickDraftImage(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      <input
                        value={draftImageLabel}
                        readOnly
                        placeholder="No image selected"
                        className="h-8 w-full rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white outline-none sm:w-auto sm:flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 rounded-full border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/18"
                        onClick={() => {
                          setDraftImageUrl("");
                          setDraftImageObjectKey(null);
                          setDraftImageFile(null);
                          setDraftImageError(null);
                          setDraftImageLabel("");
                        }}
                        disabled={!draftImageUrl.trim() && !draftImageObjectKey && !draftImageFile}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : null}
                  {isEditingForm && draftImageError ? (
                    <div className="mt-2 text-xs text-red-200">{draftImageError}</div>
                  ) : null}
                  {isEditingForm ? (
                    <div className="mt-2 max-w-2xl">
                      <input
                        value={draftPurchaseUrl}
                        onChange={(e) => setDraftPurchaseUrl(e.target.value)}
                        placeholder="Buy link (optional) e.g. https://shop.com/product"
                        className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white outline-none"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-white/80">Main accords</div>
                      <div className="mt-1 text-[11px] text-white/45">the vibe, at a glance</div>
                    </div>
                    <div className="text-[10px] text-white/45">mood</div>
                  </div>

                  <div className="mt-4">
                    {isEditingForm ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            value={draftAccordInput}
                            onChange={(e) => setDraftAccordInput(e.target.value)}
                            placeholder="Add accord (e.g. woody)"
                            className="h-9 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                          />
                          <Button className="h-9 rounded-xl px-4" onClick={addDraftAccord}>
                            Add
                          </Button>
                        </div>
                        {draftAccords.length ? draftAccords.map((it) => (
                          <div key={it.name} className="rounded-xl border border-white/10 bg-black/25 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-sm capitalize text-white/90">{it.name}</div>
                              <button
                                type="button"
                                className="text-xs text-white/60 hover:text-white"
                                onClick={() => setDraftAccords((prev) => prev.filter((x) => x.name !== it.name))}
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min={0}
                                max={3}
                                step={1}
                                value={it.strength}
                                onChange={(e) => {
                                  const next = Number(e.target.value) as 0 | 1 | 2 | 3;
                                  setDraftAccords((prev) => prev.map((x) => x.name === it.name ? { ...x, strength: next } : x));
                                }}
                                className="w-full accent-cyan-300"
                              />
                              <div className="w-20 text-right text-xs text-cyan-100">
                                {ACCORD_STRENGTH_LABELS[it.strength]}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-xs text-white/50">No accords yet.</div>
                        )}
                      </div>
                    ) : accordBars && accordBars.length ? (
                      <div className="space-y-3">
                        {accordBars.slice(0, 8).map((it) => {
                          return <Bar key={it.name} label={it.name} value01={it.value01} rightText={it.labelRight} />;
                        })}

                        <div className="mt-3 text-xs text-white/45">
                          Accord strength labels are shown for quick comparison.
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {accords.length ? accords.map((a, i) => <VibeChip key={`${a}-${i}`} text={a} />) : (
                          <span className="text-xs text-white/50">—</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-white/80">General notes</div>
                    <div className="text-[10px] text-white/45">ingredients</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {generalNotes.length ? generalNotes.map((n, i) => <VibeChip key={`${n}-${i}`} text={n} />) : (
                      <span className="text-xs text-white/50">—</span>
                    )}
                  </div>
                </div>

                {!hideComputedVotingSectionsWhileEditingCommunity ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <RankingCard
                      title="Season ranking"
                      items={canVoteFragrance && communityVoteSummary
                        ? communityVoteSummary.seasonRanking.map((x) => ({ name: x.name, score: Number(x.score ?? 0) }))
                        : seasonRanking}
                      userStarsByKey={canVoteFragrance ? communitySeasonStarsByKey : undefined}
                      onVote={canVoteFragrance && !isEditingForm ? onVoteSeason : undefined}
                      rankingNote={canVoteFragrance
                        ? (isCommunityFragrance
                          ? "Community voting bars are based on total star weight for each season."
                          : "Bars blend Fragella model baseline with community star voting for each season.")
                        : undefined}
                    />
                    <RankingCard
                      title="Occasion ranking"
                      items={canVoteFragrance && communityVoteSummary
                        ? communityVoteSummary.occasionRanking.map((x) => ({ name: x.name, score: Number(x.score ?? 0) }))
                        : occasionRanking}
                      userStarsByKey={canVoteFragrance ? communityOccasionStarsByKey : undefined}
                      onVote={canVoteFragrance && !isEditingForm ? onVoteOccasion : undefined}
                      rankingNote={canVoteFragrance
                        ? (isCommunityFragrance
                          ? "Community voting bars are based on total star weight for each occasion."
                          : "Bars blend Fragella model baseline with community star voting for each occasion.")
                        : undefined}
                    />
                  </div>
                ) : null}

                {isEditingForm ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold">Perfume pyramid</div>
                      <div className="mt-1 text-xs text-white/55">Edit top / middle / base notes in place.</div>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-xs text-white/60">Add next note to:</div>
                        <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                          {(["TOP", "MIDDLE", "BASE"] as StageKey[]).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setDraftStage(s)}
                              className={cx(
                                "rounded-lg px-3 py-1 text-xs",
                                draftStage === s ? "bg-cyan-400/20 text-cyan-100" : "text-white/65 hover:text-white"
                              )}
                            >
                              {s === "TOP" ? "Top" : s === "MIDDLE" ? "Middle" : "Base"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={draftNoteSearch}
                          onChange={(e) => setDraftNoteSearch(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomDraftNote();
                            }
                          }}
                          placeholder="Search note (e.g. bergamot)"
                          className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none sm:flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-xs text-white hover:bg-white/15 sm:w-auto"
                          onClick={addCustomDraftNote}
                          disabled={!draftNoteSearch.trim()}
                        >
                          Add custom
                        </Button>
                      </div>
                      {draftNoteAddedHint ? (
                        <div className="mt-2 text-[11px] text-cyan-100/90">{draftNoteAddedHint}</div>
                      ) : null}
                      {draftNoteResults.length ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {draftNoteResults.slice(0, 12).map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => addDraftNote(n)}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
                            >
                              {n.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4">
                      <EditablePyramidRow title="Top notes" notes={draftTopNotes} onRemove={(idx) => setDraftTopNotes((prev) => prev.filter((_, i) => i !== idx))} />
                      <EditablePyramidRow title="Middle notes" notes={draftMiddleNotes} onRemove={(idx) => setDraftMiddleNotes((prev) => prev.filter((_, i) => i !== idx))} />
                      <EditablePyramidRow title="Base notes" notes={draftBaseNotes} onRemove={(idx) => setDraftBaseNotes((prev) => prev.filter((_, i) => i !== idx))} />
                    </div>
                  </div>
                ) : hasStageNotes ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-semibold">Perfume pyramid</div>
                      <div className="mt-1 text-xs text-white/55">Top opens • Middle heart • Base lasts</div>
                    </div>

                    <div className="grid gap-4">
                      <PyramidRow title="Top notes" notes={noteGroups.top} />
                      <PyramidRow title="Middle notes" notes={noteGroups.middle} />
                      <PyramidRow title="Base notes" notes={noteGroups.base} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
                    <div className="text-xs font-medium text-white/60">Perfume pyramid</div>
                    <div className="mt-2 text-sm text-white/70">This fragrance didn’t include staged notes in the response.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-10 sm:h-0" aria-hidden />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Fragrance?"
        description="This will permanently remove this community fragrance."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={deletingCommunity}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={onDeleteCommunity}
      />

      <Dialog
        open={collectionTagDialogOpen}
        onOpenChange={(next) => {
          if (addingToCollection) return;
          setCollectionTagDialogOpen(next);
        }}
      >
        <DialogContent className="w-[calc(100vw-24px)] max-w-md rounded-3xl border-white/15 bg-[#121212]/95 p-0 text-white backdrop-blur-xl">
          <DialogHeader className="border-b border-white/10 px-5 py-4">
            <DialogTitle className="text-base text-white">Tag This Collection Add</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-5">
            <div className="text-sm text-white/75">Pick one tag for this add-to-collection post.</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {COLLECTION_TAG_OPTIONS.map((opt) => {
                const active = collectionTagSelection === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCollectionTagSelection(opt.value)}
                    className={cx(
                      "h-10 rounded-xl border px-3 text-sm transition",
                      active
                        ? "border-[#3EB489]/60 bg-[#3EB489]/20 text-[#9de2ca]"
                        : "border-white/15 bg-white/5 text-white/85 hover:bg-white/10"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 border-white/20 bg-white/10 text-white hover:bg-white/16"
                onClick={() => setCollectionTagDialogOpen(false)}
                disabled={addingToCollection}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 bg-[#3EB489] text-black hover:bg-[#34a07a]"
                onClick={confirmAddToCollection}
                disabled={addingToCollection}
              >
                {addingToCollection ? (
                  <span className="inline-flex items-center gap-2">
                    <InlineSpinner />
                    <span>Adding</span>
                  </span>
                ) : "Add to Collection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialogOpen} onOpenChange={(next) => !reviewSubmitting && setReviewDialogOpen(next)}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-xl rounded-3xl border-white/15 bg-[#121212]/90 p-0 text-white backdrop-blur-xl">
          <DialogHeader className="border-b border-white/10 px-5 py-4">
            <DialogTitle className="text-base text-white">Submit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-5">
            <div className="rounded-2xl border border-[#3EB489]/30 bg-[#3EB489]/10 px-3 py-2 text-xs text-[#9de2ca]">
              Add your own votes in fragrance details first. Only your personal inputs are included in this review scorecard.
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3EB489]">Scorecard Summary</div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/85">
                <span>
                  Overall rating: <span className="font-semibold">{ratingState?.userRating ? ratingState.userRating.toFixed(1) : "—"} / 5</span>
                </span>
              </div>
              <div className="mt-3">
                <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/55">Price Perception</div>
                {reviewScorecard.priceLabel ? (
                  <span className={cx("rounded-full border px-2 py-0.5 text-[11px] font-semibold", reviewPriceToneClasses(reviewScorecard.priceScore, true))}>
                    {reviewScorecard.priceLabel}
                  </span>
                ) : (
                  <div className="text-xs text-white/55">No price selected yet. Set price perception in fragrance details.</div>
                )}
              </div>
              {reviewScorecard.performance.length ? (
                <div className="mt-3 space-y-2">
                  {reviewScorecard.performance.map((row) => (
                    <div key={row.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-white/75">
                        <span>{row.label}</span>
                        <span>
                          {row.label.toLowerCase() === "longevity"
                            ? (COMMUNITY_LONGEVITY_LEVEL_LABELS[row.value] ?? `${row.value}/5`)
                            : row.label.toLowerCase() === "sillage"
                              ? (COMMUNITY_SILLAGE_LEVEL_LABELS[row.value] ?? `${row.value}/5`)
                              : `${row.value}/5`}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[#3EB489]" style={{ width: `${Math.round((row.value / 5) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {reviewScorecard.season.length ? (
                <div className="mt-3 text-xs text-white/80">
                  Seasons: {reviewScorecard.season.map((x) => `${x.label} ${"★".repeat(x.value)}`).join(" • ")}
                </div>
              ) : null}
              {reviewScorecard.occasion.length ? (
                <div className="mt-2 text-xs text-white/80">
                  Occasions: {reviewScorecard.occasion.map((x) => `${x.label} ${"★".repeat(x.value)}`).join(" • ")}
                </div>
              ) : null}
              {!reviewScorecard.performance.length && !reviewScorecard.season.length && !reviewScorecard.occasion.length && reviewScorecard.priceScore === null ? (
                <div className="mt-3 text-xs text-white/55">No detailed selections captured yet. Add season/occasion stars to enrich this review.</div>
              ) : null}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#3EB489]">Written Review</div>
              <Textarea
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                placeholder="Share what stood out: opening, dry down, projection, and when you’d wear it."
                className="min-h-[130px] border-white/12 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 border-white/20 bg-white/10 text-white hover:bg-white/16"
                onClick={() => setReviewDialogOpen(false)}
                disabled={reviewSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-9 bg-[#3EB489] text-black hover:bg-[#34a07a]"
                onClick={submissionHandler}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <InlineSpinner />
                    <span>Submitting</span>
                  </span>
                ) : "Submit Review"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ReportDialog
        open={reportFragranceDialogOpen}
        onOpenChange={setReportFragranceDialogOpen}
        title="Report Fragrance"
        targetLabel={`${fragrance?.brand ?? ""} ${fragrance?.name ?? ""}`.trim()}
        reasons={[...FRAGRANCE_REPORT_REASONS]}
        reason={reportFragranceReason}
        onReasonChange={(next) => setReportFragranceReason(next as "SPAM" | "INAPPROPRIATE" | "OTHER")}
        details={reportFragranceDetails}
        onDetailsChange={setReportFragranceDetails}
        submitting={reportSubmitting}
        onSubmit={submitReportFragrance}
      />

      <NoticeDialog
        open={Boolean(notice)}
        title={noticeTitle}
        message={notice ?? ""}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}
