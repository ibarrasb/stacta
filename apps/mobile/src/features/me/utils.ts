export type ScoreRow = { label: string; value: number };
export type CollectionSource = "FRAGELLA" | "COMMUNITY";

export function initials(value: string) {
  const clean = value.trim();
  if (!clean) return "S";
  const parts = clean.split(/[.@\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function compactCount(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) < 10_000) return String(Math.trunc(n));
  return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
}

export function fragranceRatingLabel(userRating: number | null | undefined) {
  const rating = Number(userRating);
  if (!Number.isFinite(rating) || rating <= 0) return "Not rated";
  return `${rating.toFixed(1)} / 5`;
}

export function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "now";
  const seconds = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function priceTagFromScore(value: number) {
  if (value <= 1) return "Very overpriced";
  if (value === 2) return "A bit overpriced";
  if (value === 3) return "Fair";
  if (value === 4) return "Good value";
  return "Excellent value";
}

export function performanceValueLabel(label: string, value: number) {
  const key = label.trim().toLowerCase();
  if (key === "longevity") {
    const map = ["", "Fleeting", "Weak", "Moderate", "Long lasting", "Endless"];
    return map[value] ?? `${value}/5`;
  }
  if (key === "sillage") {
    const map = ["", "Skin scent", "Weak", "Moderate", "Strong", "Nuclear"];
    return map[value] ?? `${value}/5`;
  }
  return `${value}/5`;
}

export function safeMap(raw: string | null): ScoreRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, value]) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 1 || n > 5) return null;
        return {
          label: key
            .split("_")
            .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
            .join(" "),
          value: n,
        };
      })
      .filter(Boolean) as ScoreRow[];
  } catch {
    return [];
  }
}

export function collectionSource(source: string): CollectionSource {
  const s = source.toUpperCase();
  if (s.includes("COMMUNITY")) return "COMMUNITY";
  return "FRAGELLA";
}
