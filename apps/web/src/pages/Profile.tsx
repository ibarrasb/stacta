import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import ProfilePhotoPicker from "@/components/profile/ProfilePhotoPicker";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import { getMe, updateMe } from "@/lib/api/me";
import { addTopFragrance, removeFromCollection, removeTopFragrance } from "@/lib/api/collection";
import type { MeResponse } from "@/lib/api/types";
import fragranceFallbackImg from "@/assets/illustrations/NotFound.png";

const FALLBACK_FRAGRANCE_IMG = fragranceFallbackImg;

function initials(name?: string | null) {
  const n = (name || "").trim();
  if (!n) return "S";
  const parts = n.split(/\s+/).slice(0, 2);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "S";
}

function compactCount(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) < 10_000) return String(Math.trunc(n));
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function StarReputation({ value }: { value: number }) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : 0;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, safe - i));
        return (
          <span key={i} className="relative inline-block text-sm leading-none text-white/25">
            ★
            <span className="absolute inset-y-0 left-0 overflow-hidden text-amber-200" style={{ width: `${Math.round(fill * 100)}%` }}>
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

function PrivacyToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative h-7 w-12 rounded-full border transition",
        checked ? "border-cyan-200/40 bg-cyan-300/30" : "border-white/15 bg-white/10",
      ].join(" ")}
      aria-pressed={checked}
      aria-label="Private profile"
    >
      <span
        className={[
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition",
          checked ? "left-6" : "left-1",
        ].join(" ")}
      />
    </button>
  );
}

type ProfileTab = "overview" | "reviews" | "wishlist" | "community";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingCollectionKey, setRemovingCollectionKey] = useState<string | null>(null);
  const [togglingTopKey, setTogglingTopKey] = useState<string | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftIsPrivate, setDraftIsPrivate] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getMe();
        if (cancelled) return;

        setMe(data);
        setDraftDisplayName(data.displayName ?? "");
        setDraftBio(data.bio ?? "");
        setDraftIsPrivate(Boolean(data.isPrivate));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const usernameLabel = useMemo(() => {
    if (!me?.username) return "—";
    return `@${me.username}`;
  }, [me?.username]);

  const canSave = useMemo(() => {
    if (!me) return false;
    const dn = draftDisplayName.trim();
    if (isEditing && dn.length === 0) return false;
    // keep it simple: require at least 2 chars for display name when editing
    if (isEditing && dn.length > 0 && dn.length < 2) return false;
    return true;
  }, [draftDisplayName, isEditing, me]);

  function onCancelEdit() {
    setIsEditing(false);
    setDraftDisplayName(me?.displayName ?? "");
    setDraftBio(me?.bio ?? "");
    setDraftIsPrivate(Boolean(me?.isPrivate));
  }

  async function onSave() {
    if (!canSave || !me) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMe({
        displayName: draftDisplayName.trim(),
        bio: draftBio.trim() || null,
        isPrivate: draftIsPrivate,
      });
      setMe(updated);
      setDraftDisplayName(updated.displayName ?? "");
      setDraftBio(updated.bio ?? "");
      setDraftIsPrivate(Boolean(updated.isPrivate));
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function onRemoveCollectionItem(source: string, externalId: string) {
    if (!me) return;
    const sourceUpper = source.toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const key = `${sourceUpper}:${externalId}`;
    setRemovingCollectionKey(key);
    setError(null);
    try {
      await removeFromCollection({ source: sourceUpper, externalId });
      setMe((prev) => {
        if (!prev) return prev;
        const nextItems = prev.collectionItems.filter(
          (x) => !(x.source.toUpperCase() === sourceUpper && x.externalId === externalId)
        );
        return {
          ...prev,
          collectionItems: nextItems,
          topFragrances: prev.topFragrances.filter(
            (x) => !(x.source.toUpperCase() === sourceUpper && x.externalId === externalId)
          ),
          collectionCount: Math.max(0, prev.collectionCount - 1),
        };
      });
    } catch (e: any) {
      setError(e?.message || "Failed to remove from collection.");
    } finally {
      setRemovingCollectionKey(null);
    }
  }

  async function onToggleTopFragrance(source: string, externalId: string) {
    if (!me) return;
    const sourceUpper = source.toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const key = `${sourceUpper}:${externalId}`;
    const item = me.collectionItems.find((x) => x.source.toUpperCase() === sourceUpper && x.externalId === externalId);
    if (!item) return;

    const exists = me.topFragrances.some((x) => x.source.toUpperCase() === sourceUpper && x.externalId === externalId);
    if (!exists && me.topFragrances.length >= 3) {
      return;
    }

    setError(null);
    setTogglingTopKey(key);
    try {
      if (exists) {
        await removeTopFragrance({ source: sourceUpper, externalId });
        setMe((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            topFragrances: prev.topFragrances.filter(
              (x) => !(x.source.toUpperCase() === sourceUpper && x.externalId === externalId)
            ),
          };
        });
      } else {
        await addTopFragrance({ source: sourceUpper, externalId });
        setMe((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            topFragrances: [...prev.topFragrances, item],
          };
        });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to update top fragrances.");
    } finally {
      setTogglingTopKey(null);
    }
  }

  function openFragranceDetail(source: string, externalId: string) {
    const normalizedSource = source.toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const encodedExternalId = encodeURIComponent(externalId);
    const item = me?.collectionItems.find(
      (x) => x.source.toUpperCase() === normalizedSource && x.externalId === externalId
    ) ?? me?.topFragrances.find(
      (x) => x.source.toUpperCase() === normalizedSource && x.externalId === externalId
    );

    navigate(`/fragrances/${encodedExternalId}?source=${normalizedSource}`, {
      state: item
        ? {
            fragrance: {
              source: normalizedSource,
              externalId: item.externalId,
              name: item.name,
              brand: item.brand,
              imageUrl: item.imageUrl,
            },
            from: { pathname: "/profile", search: "" },
          }
        : undefined,
    });
  }

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-5xl px-4 pb-10">
        {/* Top bar */}
        <div className="mb-7 flex flex-col gap-3 rounded-3xl border border-white/15 bg-black/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-amber-200/80">Identity</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">My profile</h1>
            <p className="mt-1 text-sm text-white/65">
              Keep your identity polished and control who can see your profile.
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <Button
              variant="secondary"
              className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
              onClick={() => navigate("/settings")}
            >
              Settings
            </Button>
            <Button
              variant="secondary"
              className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
              onClick={() => navigate("/home")}
            >
              Back
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/6 p-6 backdrop-blur">
            {loading && (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-6">
                <LoadingSpinner label="Loading profile..." />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && me && (
              <div className="space-y-6">
                {/* Profile header */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                    <ProfilePhotoPicker
                      fallbackText={initials(me.displayName)}
                      initialUrl={me.avatarUrl}
                      disabled={!isEditing}
                    />

                    {/* Name + username + bio */}
                    <div className="min-w-0 flex-1">
                      {!isEditing ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-2xl font-semibold tracking-tight">
                              {me.displayName || "—"}
                            </div>
                            {me.isVerified ? <VerifiedBadge /> : null}
                            <div className="rounded-full border border-cyan-300/35 bg-cyan-400/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-100">
                              {usernameLabel}
                            </div>
                            <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                              {me.isPrivate ? "Private" : "Public"}
                            </div>
                          </div>

                          <div className="mt-3 max-w-xl whitespace-pre-wrap text-sm text-white/85">
                            {me.bio?.trim() ? me.bio : (
                              <span className="text-white/50">
                                Add a bio so people know what you’re into.
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                            <div className="text-white/80"><span className="font-semibold text-white">{compactCount(me.followersCount)}</span> followers</div>
                            <div className="text-white/80"><span className="font-semibold text-white">{compactCount(me.followingCount)}</span> following</div>
                          </div>
                          <div className="mt-3 hidden items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 sm:inline-flex">
                            <span className="text-xs text-white/65">Stacta rep</span>
                            <StarReputation value={Number(me.creatorRatingAverage ?? 0)} />
                            <span className="text-xs text-white/80">
                              {me.creatorRatingCount > 0 ? `${Number(me.creatorRatingAverage ?? 0).toFixed(2)} • ${me.creatorRatingCount}` : "No ratings"}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                          <div>
                            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                              Display name
                            </div>
                            <Input
                              value={draftDisplayName}
                              onChange={(e) => setDraftDisplayName(e.target.value)}
                              className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                              placeholder="Your display name"
                              maxLength={120}
                            />
                            <div className="mt-1.5 text-xs text-white/45">
                              Up to 120 characters.
                            </div>
                          </div>

                          <div>
                            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/55">Bio</div>
                            <Textarea
                              value={draftBio}
                              onChange={(e) => setDraftBio(e.target.value)}
                              className="min-h-[110px] rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                              placeholder="Tell people your vibe…"
                              maxLength={500}
                            />
                            <div className="mt-1.5 text-xs text-white/45">
                              {draftBio.length}/500
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-xs font-semibold text-white/85">Private profile</div>
                              <div className="mt-0.5 text-[11px] text-white/55">
                                Only approved followers can see profile activity.
                              </div>
                            </div>
                            <div className="self-start sm:self-auto">
                              <PrivacyToggle checked={draftIsPrivate} onChange={setDraftIsPrivate} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="sm:hidden rounded-xl border border-white/12 bg-white/6 px-3 py-2">
                      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                        <span className="text-xs text-white/65">Stacta rep</span>
                        <div className="justify-self-center">
                          <StarReputation value={Number(me.creatorRatingAverage ?? 0)} />
                        </div>
                        <span className="text-xs text-white/80">
                          {me.creatorRatingCount > 0 ? `${Number(me.creatorRatingAverage ?? 0).toFixed(2)} • ${me.creatorRatingCount}` : "No ratings"}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-2 sm:min-w-[140px]">
                    {!isEditing ? (
                      <Button
                        className="h-10 rounded-xl px-4"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit profile
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                          onClick={onCancelEdit}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="h-10 rounded-xl px-4"
                          disabled={!canSave || saving}
                          onClick={onSave}
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Separator className="bg-white/10" />

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Collection</div>
                    <div className="mt-1 text-lg font-semibold">{me.collectionCount}</div>
                    <div className="mt-1 text-xs text-white/45">Fragrances in your collection</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Reviews</div>
                    <div className="mt-1 text-lg font-semibold">{me.reviewCount}</div>
                    <div className="mt-1 text-xs text-white/45">Fragrance reviews posted</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Community fragrances</div>
                    <div className="mt-1 text-lg font-semibold">{me.communityFragranceCount}</div>
                    <div className="mt-1 text-xs text-white/45">Fragrances you contributed</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Wishlist</div>
                    <div className="mt-1 text-lg font-semibold">—</div>
                    <div className="mt-1 text-xs text-white/45">Tab is ready, data endpoint pending</div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div
                  className="no-scrollbar overflow-x-auto"
                  role="tablist"
                  aria-label="Profile sections"
                >
                  <div className="flex min-w-max items-center gap-6 border-b border-white/10 px-1">
                    {[
                      { id: "overview" as const, label: "Overview", count: me.collectionCount },
                      { id: "reviews" as const, label: "Reviews", count: me.reviewCount },
                      { id: "wishlist" as const, label: "Wishlist" },
                      { id: "community" as const, label: "Community", count: me.communityFragranceCount },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={[
                          "group relative inline-flex items-center gap-2 py-3 text-sm font-medium transition",
                          activeTab === tab.id
                            ? "text-white"
                            : "text-white/65 hover:text-white",
                        ].join(" ")}
                      >
                        <span className={activeTab === tab.id ? "text-cyan-200" : "text-white/45 group-hover:text-white/75"}>
                          {tab.id === "overview" ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12L12 4l9 8" />
                              <path d="M5 10v10h14V10" />
                            </svg>
                          ) : null}
                          {tab.id === "reviews" ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 5h16v12H8l-4 4V5z" />
                              <path d="M8 9h8M8 13h5" />
                            </svg>
                          ) : null}
                          {tab.id === "wishlist" ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 21l-1.4-1.3C6 15.4 3 12.7 3 9.4A4.4 4.4 0 0 1 7.4 5c1.8 0 3.1.9 4.6 2.5C13.5 5.9 14.8 5 16.6 5A4.4 4.4 0 0 1 21 9.4c0 3.3-3 6-7.6 10.3z" />
                            </svg>
                          ) : null}
                          {tab.id === "community" ? (
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM8 14c-2.7 0-5 1.3-5 3v2h10v-2c0-1.7-2.3-3-5-3zM16 12c-2 0-4 1-4 2.5V19h9v-1.5c0-1.5-2.2-2.5-5-2.5z" />
                            </svg>
                          ) : null}
                        </span>
                        <span>{tab.label}</span>
                        {typeof tab.count === "number" ? (
                          <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] tabular-nums text-white/70">
                            {tab.count}
                          </span>
                        ) : null}
                        <span
                          className={[
                            "absolute -bottom-px left-0 right-0 h-[2px] rounded-full transition-all duration-200",
                            activeTab === tab.id ? "bg-cyan-300/95" : "bg-transparent group-hover:bg-white/30",
                          ].join(" ")}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === "overview" ? (
                  <div className="space-y-6">
                    <div>
                      <div className="text-sm font-semibold">Top 3 Fragrances</div>
                      <div className="mt-1 text-xs text-white/60">These are your spotlight picks.</div>
                      {!me.topFragrances?.length ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-cyan-500/10 p-4 text-sm text-white/70">
                          Pick up to 3 from your collection using “Set Top 3”.
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap justify-center gap-3">
                          {me.topFragrances.map((item, idx) => (
                            <button
                              type="button"
                              key={`${item.source}:${item.externalId}`}
                              onClick={() => openFragranceDetail(item.source, item.externalId)}
                              className="w-full rounded-2xl border border-amber-300/30 bg-gradient-to-b from-amber-300/15 via-white/5 to-black/20 p-3 shadow-[0_12px_30px_rgba(251,191,36,0.18)] sm:w-[220px]"
                            >
                              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">Top {idx + 1}</div>
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="h-28 w-full rounded-xl border border-white/15 object-cover" loading="lazy" />
                              ) : (
                                <div className="h-28 w-full rounded-xl border border-white/15 bg-white/5" />
                              )}
                              <div className="mt-2 truncate text-sm font-semibold text-white/95">{item.name}</div>
                              <div className="truncate text-xs text-white/70">{item.brand || "—"}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator className="bg-white/10" />

                    <div>
                      <div className="text-sm font-semibold">Collection</div>
                      <div className="mt-1 text-xs text-white/60">Fragrances you have added.</div>
                      {me.topFragrances.length >= 3 ? (
                        <div className="mt-1 text-xs text-amber-200/80">
                          Top 3 is full. Remove one to set another.
                        </div>
                      ) : null}
                      {!me.collectionItems?.length ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                          Your collection is empty.
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {me.collectionItems.map((item) => (
                            <div key={`${item.source}:${item.externalId}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="h-14 w-14 rounded-xl border border-white/10 object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="h-14 w-14 rounded-xl border border-white/10 bg-white/5" />
                                  )}
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-white/90">{item.name}</div>
                                    <div className="truncate text-xs text-white/60">{item.brand || "—"}</div>
                                  </div>
                                </div>
                                <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                                  <Button
                                    variant="secondary"
                                    className="h-8 flex-1 rounded-lg border border-white/15 bg-white/10 px-2 text-xs text-white hover:bg-white/15 sm:flex-none"
                                    onClick={() => openFragranceDetail(item.source, item.externalId)}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="h-8 flex-1 rounded-lg border border-white/15 bg-white/10 px-2 text-xs text-white hover:bg-white/15 sm:flex-none"
                                    disabled={removingCollectionKey === `${item.source}:${item.externalId}`}
                                    onClick={() => onRemoveCollectionItem(item.source, item.externalId)}
                                  >
                                    {removingCollectionKey === `${item.source}:${item.externalId}` ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <InlineSpinner className="h-3 w-3" />
                                        <span>Removing</span>
                                      </span>
                                    ) : "Remove"}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    className="h-8 flex-1 rounded-lg border border-white/15 bg-white/10 px-2 text-xs text-white hover:bg-white/15 sm:flex-none"
                                    disabled={
                                      togglingTopKey === `${item.source.toUpperCase()}:${item.externalId}` ||
                                      (!me.topFragrances.some(
                                        (x) => x.source.toUpperCase() === item.source.toUpperCase() && x.externalId === item.externalId
                                      ) &&
                                        me.topFragrances.length >= 3)
                                    }
                                    onClick={() => onToggleTopFragrance(item.source, item.externalId)}
                                  >
                                    {me.topFragrances.some(
                                      (x) => x.source.toUpperCase() === item.source.toUpperCase() && x.externalId === item.externalId
                                    )
                                      ? (togglingTopKey === `${item.source.toUpperCase()}:${item.externalId}` ? (
                                        <span className="inline-flex items-center gap-1.5">
                                          <InlineSpinner className="h-3 w-3" />
                                          <span>Updating</span>
                                        </span>
                                      ) : "Remove Top 3")
                                      : (togglingTopKey === `${item.source.toUpperCase()}:${item.externalId}` ? (
                                        <span className="inline-flex items-center gap-1.5">
                                          <InlineSpinner className="h-3 w-3" />
                                          <span>Updating</span>
                                        </span>
                                      ) : "Set Top 3")}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === "reviews" ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-sm font-semibold">Reviews</div>
                    <div className="mt-1 text-xs text-white/60">You have posted {me.reviewCount} review(s).</div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                      Review listing is being wired next. Your review metrics are tracked and this tab is ready.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button className="h-9 rounded-xl px-4" onClick={() => navigate("/search")}>
                        Discover fragrances to review
                      </Button>
                    </div>
                  </div>
                ) : null}

                {activeTab === "wishlist" ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-sm font-semibold">Wishlist</div>
                    <div className="mt-1 text-xs text-white/60">Save fragrances you want to try later.</div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                      Wishlist UI/data endpoint is the next integration. This tab is now in place for that flow.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button className="h-9 rounded-xl px-4" onClick={() => navigate("/search")}>
                        Browse fragrances
                      </Button>
                    </div>
                  </div>
                ) : null}

                {activeTab === "community" ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-sm font-semibold">Community Fragrances</div>
                    <div className="mt-1 text-xs text-white/60">
                      You have contributed {me.communityFragranceCount} community fragrance(s).
                    </div>
                    {!me.communityFragrances?.length ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                        You have not created any community fragrances yet.
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {me.communityFragrances.map((item) => (
                          <div key={`${item.source}:${item.externalId}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.imageUrl?.trim() ? item.imageUrl : FALLBACK_FRAGRANCE_IMG}
                                alt={item.name}
                                className="h-14 w-14 rounded-xl border border-white/10 object-cover bg-white/5"
                                loading="lazy"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  if (img.dataset.fallbackApplied === "1") return;
                                  img.dataset.fallbackApplied = "1";
                                  img.src = FALLBACK_FRAGRANCE_IMG;
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-white/90">{item.name}</div>
                                <div className="truncate text-xs text-white/60">{item.brand || "—"}</div>
                              </div>
                              <Button
                                variant="secondary"
                                className="h-8 rounded-lg border border-white/15 bg-white/10 px-3 text-xs text-white hover:bg-white/15"
                                onClick={() => openFragranceDetail(item.source, item.externalId)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button className="h-9 rounded-xl px-4" onClick={() => navigate("/search")}>
                        Add / explore community fragrances
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
