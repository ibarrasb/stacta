import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCommunityFragrance,
  searchNotes,
  type NoteDictionaryItem,
  type CreateCommunityFragranceRequest,
  type FragranceSearchResult,
} from "@/lib/api/fragrances";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialBrand?: string;
  initialName?: string;
  onCreated: (fragrance: FragranceSearchResult) => void;
};

function uniqById(arr: NoteDictionaryItem[]) {
  const map = new Map<string, NoteDictionaryItem>();
  for (const n of arr) {
    if (n?.id) map.set(n.id, n);
  }
  return Array.from(map.values());
}

function parseScore(vRaw: string): number | null {
  const v = vRaw.trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export default function AddCommunityFragranceDialog({
  open,
  onOpenChange,
  initialBrand,
  initialName,
  onCreated,
}: Props) {
  const [brand, setBrand] = useState(initialBrand ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [year, setYear] = useState("");
  const [concentration, setConcentration] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [longevity, setLongevity] = useState<number | null>(null);
  const [sillage, setSillage] = useState<number | null>(null);

  const [noteSearch, setNoteSearch] = useState("");
  const [noteResults, setNoteResults] = useState<NoteDictionaryItem[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const [top, setTop] = useState<NoteDictionaryItem[]>([]);
  const [middle, setMiddle] = useState<NoteDictionaryItem[]>([]);
  const [base, setBase] = useState<NoteDictionaryItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // reset when opened
  useEffect(() => {
    if (!open) return;
    setBrand(initialBrand ?? "");
    setName(initialName ?? "");
    setYear("");
    setConcentration("");
    setVisibility("PRIVATE");
    setLongevity(null);
    setSillage(null);
    setTop([]);
    setMiddle([]);
    setBase([]);
    setNoteSearch("");
    setNoteResults([]);
    setError(null);
  }, [open, initialBrand, initialName]);

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

  const canSave = useMemo(() => {
    return brand.trim().length > 0 && name.trim().length > 0;
  }, [brand, name]);

  function addNote(stage: "TOP" | "MIDDLE" | "BASE", n: NoteDictionaryItem) {
    if (!n?.id) return;

    if (stage === "TOP") setTop((prev) => uniqById([...prev, n]).slice(0, 20));
    if (stage === "MIDDLE") setMiddle((prev) => uniqById([...prev, n]).slice(0, 20));
    if (stage === "BASE") setBase((prev) => uniqById([...prev, n]).slice(0, 20));
  }

  function removeNote(stage: "TOP" | "MIDDLE" | "BASE", id: string) {
    if (stage === "TOP") setTop((prev) => prev.filter((x) => x.id !== id));
    if (stage === "MIDDLE") setMiddle((prev) => prev.filter((x) => x.id !== id));
    if (stage === "BASE") setBase((prev) => prev.filter((x) => x.id !== id));
  }

  async function onSave() {
    setError(null);
    if (!canSave) return;

    const body: CreateCommunityFragranceRequest = {
      name: name.trim(),
      brand: brand.trim(),
      year: year.trim() || null,
      concentration: concentration.trim() || null,
      longevityScore: longevity,
      sillageScore: sillage,
      visibility,
      topNoteIds: top.map((x) => x.id),
      middleNoteIds: middle.map((x) => x.id),
      baseNoteIds: base.map((x) => x.id),
    };

    setSaving(true);
    try {
      const created = await createCommunityFragrance(body);
      onCreated(created);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create fragrance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl border border-white/10 bg-[#0b0b10] text-white">
        <DialogHeader>
          <DialogTitle className="text-lg">Add a community fragrance</DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-white/60">Brand</div>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                placeholder="Dior"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Name</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                placeholder="Sauvage"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-white/60">Year (optional)</div>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                placeholder="2015"
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Concentration (optional)</div>
              <Input
                value={concentration}
                onChange={(e) => setConcentration(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                placeholder="EDT / EDP / Parfum"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
            <div>
              <div className="text-sm font-medium">Visibility</div>
              <div className="text-xs text-white/60">
                Private means only you can see it. Public lets others find it.
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={visibility === "PRIVATE" ? "default" : "secondary"}
                className="h-9 rounded-xl"
                onClick={() => setVisibility("PRIVATE")}
              >
                Private
              </Button>
              <Button
                type="button"
                variant={visibility === "PUBLIC" ? "default" : "secondary"}
                className="h-9 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                onClick={() => setVisibility("PUBLIC")}
              >
                Public
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Longevity (1–5 optional)</div>
              <Input
                value={longevity ?? ""}
                onChange={(e) => setLongevity(parseScore(e.target.value))}
                className="mt-2 h-10 rounded-xl border-white/10 bg-white/5 text-white"
                placeholder="e.g. 4"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Sillage (1–5 optional)</div>
              <Input
                value={sillage ?? ""}
                onChange={(e) => setSillage(parseScore(e.target.value))}
                className="mt-2 h-10 rounded-xl border-white/10 bg-white/5 text-white"
                placeholder="e.g. 3"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Notes</div>
                <div className="text-xs text-white/60">Search and add notes to each stage.</div>
              </div>
              <div className="text-xs text-white/50">{loadingNotes ? "Searching…" : ""}</div>
            </div>

            <div className="mt-3">
              <Input
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                placeholder="Search notes (e.g. bergamot, amber, vanilla)…"
              />
            </div>

            {noteResults.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {noteResults.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2"
                  >
                    <div className="flex items-center gap-2">
                      {n.imageUrl ? (
                        <img src={n.imageUrl} className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-white/10" />
                      )}
                      <div className="text-sm">{n.name}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" className="h-8 rounded-xl px-3" onClick={() => addNote("TOP", n)}>
                        Top
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15 px-3"
                        onClick={() => addNote("MIDDLE", n)}
                      >
                        Mid
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15 px-3"
                        onClick={() => addNote("BASE", n)}
                      >
                        Base
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stage title="Top" items={top} onRemove={(id) => removeNote("TOP", id)} />
              <Stage title="Middle" items={middle} onRemove={(id) => removeNote("MIDDLE", id)} />
              <Stage title="Base" items={base} onRemove={(id) => removeNote("BASE", id)} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" className="h-10 rounded-xl px-5" onClick={onSave} disabled={!canSave || saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stage({
  title,
  items,
  onRemove,
}: {
  title: string;
  items: NoteDictionaryItem[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-medium text-white/80">{title}</div>
        <div className="text-[10px] text-white/50">{items.length}</div>
      </div>
      <div className="space-y-2">
        {items.length ? (
          items.map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-xl bg-white/5 px-2 py-1">
              <div className="truncate text-xs text-white/80">{n.name}</div>
              <button
                type="button"
                className="text-xs text-white/50 hover:text-white"
                onClick={() => onRemove(n.id)}
              >
                ✕
              </button>
            </div>
          ))
        ) : (
          <div className="text-xs text-white/40">—</div>
        )}
      </div>
    </div>
  );
}
