import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import defaultNoteImg from "@/assets/notes/default-note.png";
import {
  createCommunityFragrance,
  updateCommunityFragrance,
  searchNotes,
  type NoteDictionaryItem,
  type CreateCommunityFragranceRequest,
  type FragranceSearchResult,
} from "@/lib/api/fragrances";

const DEFAULT_NOTE_IMG = defaultNoteImg;
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

const ACCORD_STRENGTH_LABELS = ["Low", "Moderate", "Prominent", "Dominant"] as const;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialBrand?: string;
  initialName?: string;
  initialFragrance?: FragranceSearchResult | null;
  onSaved: (fragrance: FragranceSearchResult) => void;
  inlineMode?: boolean;
};

type StageKey = "TOP" | "MIDDLE" | "BASE";
type AccordItem = { name: string; strength: number };

function uniqById(arr: NoteDictionaryItem[]) {
  const map = new Map<string, NoteDictionaryItem>();
  for (const n of arr) {
    const idKey = String(n?.id ?? "").trim();
    const nameKey = String(n?.name ?? "").trim().toLowerCase();
    const key = idKey || `name:${nameKey}`;
    if (!key || key === "name:") continue;
    map.set(key, n);
  }
  return Array.from(map.values());
}

function parseAccordsFromInitial(fragrance: FragranceSearchResult | null | undefined): AccordItem[] {
  const out: AccordItem[] = [];
  const map = fragrance?.mainAccordsPercentage ?? null;
  if (map && typeof map === "object") {
    Object.entries(map).forEach(([name, level]) => {
      const key = String(name ?? "").trim();
      if (!key) return;
      const idx = ACCORD_STRENGTH_LABELS.findIndex((x) => x.toLowerCase() === String(level ?? "").trim().toLowerCase());
      out.push({ name: key, strength: idx >= 0 ? idx : 1 });
    });
  }
  if (!out.length && Array.isArray(fragrance?.mainAccords)) {
    fragrance.mainAccords.forEach((name) => {
      const key = String(name ?? "").trim();
      if (!key) return;
      out.push({ name: key, strength: 1 });
    });
  }
  const deduped = new Map<string, AccordItem>();
  out.forEach((item) => {
    if (!deduped.has(item.name.toLowerCase())) deduped.set(item.name.toLowerCase(), item);
  });
  return Array.from(deduped.values()).slice(0, 20);
}

export default function AddCommunityFragranceDialog({
  open,
  onOpenChange,
  initialBrand,
  initialName,
  initialFragrance,
  onSaved,
  inlineMode = false,
}: Props) {
  const isEdit = Boolean(initialFragrance?.externalId && String(initialFragrance?.source ?? "").toUpperCase() === "COMMUNITY");

  const [brand, setBrand] = useState(initialBrand ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [year, setYear] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [concentration, setConcentration] = useState("");

  const [isPublic, setIsPublic] = useState(false);
  const visibility = useMemo<"PRIVATE" | "PUBLIC">(() => (isPublic ? "PUBLIC" : "PRIVATE"), [isPublic]);

  const [accordInput, setAccordInput] = useState("");
  const [accords, setAccords] = useState<AccordItem[]>([]);

  const [noteSearch, setNoteSearch] = useState("");
  const [noteResults, setNoteResults] = useState<NoteDictionaryItem[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [stage, setStage] = useState<StageKey>("TOP");
  const [top, setTop] = useState<NoteDictionaryItem[]>([]);
  const [middle, setMiddle] = useState<NoteDictionaryItem[]>([]);
  const [base, setBase] = useState<NoteDictionaryItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteAddedHint, setNoteAddedHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const source = String(initialFragrance?.source ?? "").toUpperCase();
    if (initialFragrance && source === "COMMUNITY") {
      setBrand(initialFragrance.brand ?? "");
      setName(initialFragrance.name ?? "");
      setYear(initialFragrance.year ?? "");
      setImageUrl((initialFragrance.imageUrl ?? "").trim());
      setConcentration(initialFragrance.concentration ?? initialFragrance.oilType ?? "");
      setIsPublic(String(initialFragrance.visibility ?? "PRIVATE").toUpperCase() === "PUBLIC");
      setAccords(parseAccordsFromInitial(initialFragrance));
      setTop((initialFragrance.notes?.top ?? []).map((n, i) => ({ id: n.id || `top-${i}-${n.name}`, name: n.name, imageUrl: n.imageUrl, usageCount: null })));
      setMiddle((initialFragrance.notes?.middle ?? []).map((n, i) => ({ id: n.id || `middle-${i}-${n.name}`, name: n.name, imageUrl: n.imageUrl, usageCount: null })));
      setBase((initialFragrance.notes?.base ?? []).map((n, i) => ({ id: n.id || `base-${i}-${n.name}`, name: n.name, imageUrl: n.imageUrl, usageCount: null })));
    } else {
      setBrand(initialBrand ?? "");
      setName(initialName ?? "");
      setYear("");
      setImageUrl("");
      setConcentration("");
      setIsPublic(false);
      setAccords([]);
      setStage("TOP");
      setTop([]);
      setMiddle([]);
      setBase([]);
    }

    setNoteSearch("");
    setNoteResults([]);
    setError(null);
    setNoteAddedHint(null);
  }, [open, initialBrand, initialName, initialFragrance]);

  useEffect(() => {
    if (!noteAddedHint) return;
    const t = window.setTimeout(() => setNoteAddedHint(null), 1400);
    return () => window.clearTimeout(t);
  }, [noteAddedHint]);

  useEffect(() => {
    if (!open) return;
    const q = noteSearch.trim();
    if (q.length < 2) {
      setNoteResults([]);
      return;
    }

    let cancelled = false;
    setLoadingNotes(true);

    searchNotes({ search: q, limit: 30 })
      .then((list) => {
        if (cancelled) return;
        setNoteResults(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (cancelled) return;
        setNoteResults([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingNotes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noteSearch, open]);

  const canSave = useMemo(() => brand.trim().length > 0 && name.trim().length > 0, [brand, name]);

  function addNote(targetStage: StageKey, n: NoteDictionaryItem) {
    if (targetStage === "TOP") setTop((prev) => uniqById([...prev, n]).slice(0, 20));
    if (targetStage === "MIDDLE") setMiddle((prev) => uniqById([...prev, n]).slice(0, 20));
    if (targetStage === "BASE") setBase((prev) => uniqById([...prev, n]).slice(0, 20));
    const stageLabel = targetStage === "TOP" ? "Top notes" : targetStage === "MIDDLE" ? "Middle notes" : "Base notes";
    setNoteAddedHint(`Added to ${stageLabel}`);
  }

  function addCustomNote() {
    const cleaned = noteSearch.trim();
    if (!cleaned) return;
    addNote(stage, {
      id: `custom-${stage.toLowerCase()}-${Date.now()}`,
      name: cleaned,
      imageUrl: null,
      usageCount: null,
    });
    setNoteSearch("");
    setNoteResults([]);
  }

  function removeNote(targetStage: StageKey, id: string) {
    if (targetStage === "TOP") setTop((prev) => prev.filter((x) => x.id !== id));
    if (targetStage === "MIDDLE") setMiddle((prev) => prev.filter((x) => x.id !== id));
    if (targetStage === "BASE") setBase((prev) => prev.filter((x) => x.id !== id));
  }

  function addAccord() {
    const cleaned = accordInput.trim();
    if (!cleaned) return;
    setAccords((prev) => {
      const exists = prev.some((x) => x.name.toLowerCase() === cleaned.toLowerCase());
      if (exists || prev.length >= 20) return prev;
      return [...prev, { name: cleaned, strength: 1 }];
    });
    setAccordInput("");
  }

  function updateAccordStrength(name: string, strength: number) {
    setAccords((prev) => prev.map((item) => (item.name === name ? { ...item, strength } : item)));
  }

  function removeAccord(name: string) {
    setAccords((prev) => prev.filter((item) => item.name !== name));
  }

  async function onSave() {
    setError(null);
    if (!canSave) return;

    const mainAccords = accords.map((x) => x.name);
    const mainAccordsPercentage = accords.length
      ? accords.reduce<Record<string, string>>((acc, item) => {
          acc[item.name] = ACCORD_STRENGTH_LABELS[item.strength] ?? "Moderate";
          return acc;
        }, {})
      : null;

    const topNoteIds = top.map((x) => x.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    const middleNoteIds = middle.map((x) => x.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    const baseNoteIds = base.map((x) => x.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));

    const toCustomNames = (items: NoteDictionaryItem[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const n of items) {
        const id = String(n.id ?? "").trim();
        if (/^[0-9a-f-]{36}$/i.test(id)) continue;
        const cleaned = String(n.name ?? "").trim();
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(cleaned);
        if (out.length >= 20) break;
      }
      return out;
    };

    const body: CreateCommunityFragranceRequest = {
      name: name.trim(),
      brand: brand.trim(),
      year: year.trim() || null,
      imageUrl: imageUrl.trim() || null,
      concentration: concentration.trim() || null,
      longevityScore: null,
      sillageScore: null,
      confidence: null,
      popularity: null,
      mainAccords,
      mainAccordsPercentage,
      visibility,
      topNoteIds: !isEdit || topNoteIds.length ? topNoteIds : undefined,
      middleNoteIds: !isEdit || middleNoteIds.length ? middleNoteIds : undefined,
      baseNoteIds: !isEdit || baseNoteIds.length ? baseNoteIds : undefined,
      topNoteNames: !isEdit || top.length ? toCustomNames(top) : undefined,
      middleNoteNames: !isEdit || middle.length ? toCustomNames(middle) : undefined,
      baseNoteNames: !isEdit || base.length ? toCustomNames(base) : undefined,
    };

    setSaving(true);
    try {
      const externalId = String(initialFragrance?.externalId ?? "").trim();
      const saved = isEdit && externalId
        ? await updateCommunityFragrance(externalId, body)
        : await createCommunityFragrance(body);
      onSaved(saved);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || `Failed to ${isEdit ? "update" : "create"} fragrance.`);
    } finally {
      setSaving(false);
    }
  }

  const formBody = (
    <>
      {inlineMode ? (
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{isEdit ? "Edit community fragrance" : "Add a community fragrance"}</h3>
        </div>
      ) : (
        <DialogHeader>
          <DialogTitle className="text-lg">{isEdit ? "Edit community fragrance" : "Add a community fragrance"}</DialogTitle>
        </DialogHeader>
      )}

      {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

        {!isEdit ? (
          <div className="rounded-2xl border border-amber-200/25 bg-amber-200/10 px-4 py-3 text-xs text-amber-100/95">
            Draft tip: keep this fragrance private while you build it out. You can switch between private and public anytime while editing.
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-white/60">Brand</div>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="h-10 rounded-xl border-white/10 bg-white/5 text-white" placeholder="Dior" />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl border-white/10 bg-white/5 text-white" placeholder="Sauvage" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-white/60">Year (optional)</div>
              <Input value={year} onChange={(e) => setYear(e.target.value)} className="h-10 rounded-xl border-white/10 bg-white/5 text-white" placeholder="2015" />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Concentration (optional)</div>
              <select value={concentration} onChange={(e) => setConcentration(e.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus-visible:border-white/20">
                <option value="">Select concentration</option>
                {CONCENTRATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-white/60">Image URL (optional)</div>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="h-10 rounded-xl border-white/10 bg-white/5 text-white" placeholder="https://..." />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">Visibility</div>
              <div className="text-xs text-white/60">{isPublic ? "Public: others can find it." : "Private: only you can see it."}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${!isPublic ? "text-white" : "text-white/60"}`}>Private</span>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              <span className={`text-xs ${isPublic ? "text-white" : "text-white/60"}`}>Public</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Main accords</div>
              <div className="text-xs text-white/55">{accords.length}/20</div>
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={accordInput} onChange={(e) => setAccordInput(e.target.value)} className="h-10 rounded-xl border-white/10 bg-white/5 text-white" placeholder="Add accord (e.g. woody)" />
              <Button type="button" className="h-10 rounded-xl px-4" onClick={addAccord}>Add</Button>
            </div>
            {accords.length ? (
              <div className="mt-3 space-y-3">
                {accords.map((item) => (
                  <div key={item.name} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm text-white/90 capitalize">{item.name}</div>
                      <button type="button" className="rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white" onClick={() => removeAccord(item.name)}>Remove</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="range" min={0} max={3} step={1} value={item.strength} onChange={(e) => updateAccordStrength(item.name, Number(e.target.value))} className="w-full accent-cyan-300" />
                      <div className="w-20 text-right text-xs text-cyan-100">{ACCORD_STRENGTH_LABELS[item.strength]}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Notes</div>
                <div className="text-xs text-white/60">Search notes, then add them to Top/Middle/Base.</div>
              </div>
              <div className="text-xs text-white/50">{loadingNotes ? "Searching…" : ""}</div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-xs text-white/60">Add next note to:</div>
              <ToggleGroup type="single" value={stage} onValueChange={(v) => v && setStage(v as StageKey)} className="gap-2">
                <ToggleGroupItem value="TOP" className="h-8 rounded-xl px-3 text-xs">Top</ToggleGroupItem>
                <ToggleGroupItem value="MIDDLE" className="h-8 rounded-xl px-3 text-xs">Mid</ToggleGroupItem>
                <ToggleGroupItem value="BASE" className="h-8 rounded-xl px-3 text-xs">Base</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="mt-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomNote();
                    }
                  }}
                  className="h-10 w-full rounded-xl border-white/10 bg-white/5 text-white sm:flex-1"
                  placeholder="Search notes (e.g. bergamot, amber, vanilla)…"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 w-full rounded-xl border border-white/12 bg-white/10 px-3 text-xs text-white hover:bg-white/15 sm:w-auto"
                  onClick={addCustomNote}
                  disabled={!noteSearch.trim()}
                >
                  Add custom
                </Button>
              </div>
              {noteAddedHint ? (
                <div className="mt-2 text-[11px] text-cyan-100/90">{noteAddedHint}</div>
              ) : null}
            </div>

            {noteResults.length ? (
              <div className="mt-3 max-h-60 overflow-y-auto pr-1">
                <div className="grid gap-2 sm:grid-cols-2">
                  {noteResults.slice(0, 30).map((n) => (
                    <div key={n.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={n.imageUrl || DEFAULT_NOTE_IMG}
                          onError={(e) => { e.currentTarget.src = DEFAULT_NOTE_IMG; }}
                          alt={n.name}
                          className={`h-9 w-9 shrink-0 rounded-xl object-cover ${!n.imageUrl ? "scale-[1.30]" : "scale-100"}`}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm">{n.name}</div>
                          <div className="mt-0.5 text-[11px] text-white/50">{typeof n.usageCount === "number" ? `Used ${n.usageCount}` : ""}</div>
                        </div>
                      </div>
                      <Button type="button" className="h-8 rounded-xl px-3 text-xs" onClick={() => addNote(stage, n)}>Add</Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stage title="Top" items={top} onRemove={(id) => removeNote("TOP", id)} />
              <Stage title="Middle" items={middle} onRemove={(id) => removeNote("MIDDLE", id)} />
              <Stage title="Base" items={base} onRemove={(id) => removeNote("BASE", id)} />
            </div>
          </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" className="h-10 rounded-xl px-5" onClick={onSave} disabled={!canSave || saving}>{saving ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save changes" : "Create")}</Button>
        </div>
      </div>
    </>
  );

  if (inlineMode) {
    if (!open) return null;
    return (
      <div className="rounded-3xl border border-white/10 bg-[#0b0b10] p-4">
        {formBody}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-24px)] max-w-2xl overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-[#0b0b10] text-white [-webkit-overflow-scrolling:touch]">
        {formBody}
      </DialogContent>
    </Dialog>
  );
}

function Stage({ title, items, onRemove }: { title: string; items: NoteDictionaryItem[]; onRemove: (id: string) => void; }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-white/80">{title}</div>
        <div className="text-[10px] text-white/50">{items.length}</div>
      </div>
      <div className="space-y-2">
        {items.length ? (
          items.map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
              <div className="min-w-0 truncate text-xs text-white/85">{n.name}</div>
              <button type="button" className="shrink-0 rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white" onClick={() => onRemove(n.id)} aria-label={`Remove ${n.name}`}>✕</button>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/40">—</div>
        )}
      </div>
    </div>
  );
}
