import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import LoadingSpinner from "@/components/ui/loading-spinner";
import InlineSpinner from "@/components/ui/inline-spinner";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import { followUser, unfollowUser } from "@/lib/api/follows";
import { getUserProfile } from "@/lib/api/users";
import type { UserProfileResponse } from "@/lib/api/types";
import fragranceFallbackImg from "@/assets/illustrations/NotFound.png";

const FALLBACK_FRAGRANCE_IMG = fragranceFallbackImg;

function getInitials(value: string) {
  const v = value.trim();
  if (!v) return "U";
  return v.slice(0, 2).toUpperCase();
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

type PublicProfileTab = "overview" | "reviews" | "wishlist" | "community";

export default function PublicProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username = "" } = useParams();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<PublicProfileTab>("overview");

  const backTarget = useMemo(() => {
    const stateFrom = (location.state as any)?.from?.pathname;
    if (typeof stateFrom === "string" && stateFrom.trim()) return stateFrom;
    return "/users";
  }, [location.state]);

  const safeUsername = useMemo(() => {
    const raw = String(username ?? "").trim();
    if (!raw || raw.toLowerCase() === "null" || raw.toLowerCase() === "undefined") return "user";
    return raw;
  }, [username]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserProfile(username);
        if (cancelled) return;
        setProfile(data);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!username.trim()) {
      setLoading(false);
      setError("Missing username.");
      return;
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  async function onToggleFollow() {
    if (!profile || profile.isOwner) return;
    const isUnfollowAction = profile.isFollowing || profile.followRequested;
    if (isUnfollowAction) {
      setPendingConfirm({
        title: profile.isFollowing ? "Unfollow User?" : "Cancel Follow Request?",
        message: profile.isFollowing
          ? `Are you sure you want to unfollow @${profile.username}?`
          : `Are you sure you want to cancel your follow request to @${profile.username}?`,
      });
      return;
    }

    await runToggleFollow();
  }

  async function runToggleFollow() {
    if (!profile || profile.isOwner) return;
    const isUnfollowAction = profile.isFollowing || profile.followRequested;
    setActionLoading(true);
    setError(null);
    try {
      if (isUnfollowAction) {
        await unfollowUser(profile.username);
      } else {
        await followUser(profile.username);
      }
      const next = await getUserProfile(profile.username);
      setProfile(next);
    } catch (e: any) {
      setError(e?.message || "Failed to update follow status.");
    } finally {
      setActionLoading(false);
      setPendingConfirm(null);
    }
  }

  function openFragranceDetail(source: string, externalId: string) {
    const normalizedSource = source.toUpperCase() === "COMMUNITY" ? "COMMUNITY" : "FRAGELLA";
    const encodedExternalId = encodeURIComponent(externalId);
  const item = profile?.collectionItems.find(
    (x) => x.source.toUpperCase() === normalizedSource && x.externalId === externalId
  ) ?? profile?.topFragrances.find(
    (x) => x.source.toUpperCase() === normalizedSource && x.externalId === externalId
  ) ?? profile?.wishlistItems.find(
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
            from: { pathname: location.pathname, search: location.search ?? "" },
          }
        : undefined,
    });
  }

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-5xl px-4 pb-10">
        <div className="mb-7 flex flex-col gap-3 rounded-3xl border border-white/15 bg-black/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-amber-200/80">Community profile</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Profile</h1>
            <p className="mt-1 text-sm text-white/65">Viewing @{safeUsername}</p>
          </div>
          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
            onClick={() => navigate(backTarget)}
          >
            {backTarget === "/notifications" ? "Back to notifications" : "Back to users"}
          </Button>
        </div>

        <div>
          <div className="rounded-3xl border border-white/15 bg-white/6 p-6 backdrop-blur">
            {loading && (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-6">
                <LoadingSpinner label="Loading profile..." />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && profile && (
              <div className="space-y-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                    <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt={`${profile.username} avatar`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white/90">
                          {getInitials(profile.displayName || profile.username)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-2xl font-semibold tracking-tight">
                          {profile.displayName || profile.username}
                        </div>
                        {profile.isVerified ? <VerifiedBadge /> : null}
                        <div className="rounded-full border border-cyan-300/35 bg-cyan-400/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-100">
                          @{profile.username}
                        </div>
                        <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                          {profile.isPrivate ? "Private" : "Public"}
                        </div>
                      </div>

                      {!profile.isVisible ? (
                        <div className="mt-3 max-w-xl text-sm text-white/75">
                          This account is private. Send a follow request to see more.
                        </div>
                      ) : (
                        <div className="mt-3 max-w-xl whitespace-pre-wrap text-sm text-white/85">
                          {profile.bio?.trim() ? profile.bio : "No bio yet."}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                        <div className="text-white/80">
                          <span className="font-semibold text-white">{compactCount(profile.followersCount)}</span> followers
                        </div>
                        <div className="text-white/80">
                          <span className="font-semibold text-white">{compactCount(profile.followingCount)}</span> following
                        </div>
                      </div>
                      <div className="mt-3 hidden items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1.5 sm:inline-flex">
                        <span className="text-xs text-white/65">Stacta rep</span>
                        <StarReputation value={Number(profile.creatorRatingAverage ?? 0)} />
                        <span className="text-xs text-white/80">
                          {profile.creatorRatingCount > 0 ? `${Number(profile.creatorRatingAverage ?? 0).toFixed(2)} • ${profile.creatorRatingCount}` : "No ratings"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:hidden rounded-xl border border-white/12 bg-white/6 px-3 py-2">
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                      <span className="text-xs text-white/65">Stacta rep</span>
                      <div className="justify-self-center">
                        <StarReputation value={Number(profile.creatorRatingAverage ?? 0)} />
                      </div>
                      <span className="text-xs text-white/80">
                        {profile.creatorRatingCount > 0 ? `${Number(profile.creatorRatingAverage ?? 0).toFixed(2)} • ${profile.creatorRatingCount}` : "No ratings"}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 sm:min-w-[140px]">
                    {profile.isOwner ? (
                      <Button className="h-10 rounded-xl px-4" onClick={() => navigate("/profile")}>
                        Edit my profile
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                        disabled={actionLoading}
                        onClick={onToggleFollow}
                      >
                        {actionLoading
                          ? (
                            <span className="inline-flex items-center gap-2">
                              <InlineSpinner />
                              <span>Working</span>
                            </span>
                          )
                          : profile.isFollowing
                            ? "Following"
                            : profile.followRequested
                              ? "Requested"
                              : "Follow"}
                      </Button>
                    )}
                  </div>
                </div>
                <Separator className="bg-white/10" />

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Collection</div>
                    <div className="mt-1 text-lg font-semibold">{profile.isVisible ? profile.collectionCount : "—"}</div>
                    <div className="mt-1 text-xs text-white/45">Fragrances in collection</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Reviews</div>
                    <div className="mt-1 text-lg font-semibold">{profile.isVisible ? profile.reviewCount : "—"}</div>
                    <div className="mt-1 text-xs text-white/45">Fragrance reviews posted</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Community fragrances</div>
                    <div className="mt-1 text-lg font-semibold">{profile.isVisible ? profile.communityFragranceCount : "—"}</div>
                    <div className="mt-1 text-xs text-white/45">Fragrances contributed</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Wishlist</div>
                    <div className="mt-1 text-lg font-semibold">{profile.isVisible ? profile.wishlistCount : "—"}</div>
                    <div className="mt-1 text-xs text-white/45">Fragrances on wishlist</div>
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
                      { id: "overview" as const, label: "Overview", count: profile.isVisible ? profile.collectionCount : undefined },
                      { id: "reviews" as const, label: "Reviews", count: profile.isVisible ? profile.reviewCount : undefined },
                      { id: "wishlist" as const, label: "Wishlist", count: profile.isVisible ? profile.wishlistCount : undefined },
                      { id: "community" as const, label: "Community", count: profile.isVisible ? profile.communityFragranceCount : undefined },
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
                <div className="px-1 pt-1 text-[11px] text-white/45 sm:hidden">Swipe right to see more tabs.</div>

                {activeTab === "overview" ? (
                  <div className="space-y-6">
                    <div>
                      <div className="text-sm font-semibold">Top 3 Fragrances</div>
                      <div className="mt-1 text-xs text-white/60">
                        {profile.isVisible ? "Their spotlight picks." : "Follow to view top fragrances."}
                      </div>
                      {!profile.isVisible ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                          Top fragrances are hidden because this account is private.
                        </div>
                      ) : !profile.topFragrances?.length ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-cyan-500/10 p-4 text-sm text-white/70">
                          No top fragrances selected yet.
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap justify-center gap-3">
                          {profile.topFragrances.map((item, idx) => (
                            <button
                              type="button"
                              key={`${item.source}:${item.externalId}`}
                              onClick={() => openFragranceDetail(item.source, item.externalId)}
                              className="w-full rounded-2xl border border-amber-300/30 bg-gradient-to-b from-amber-300/15 via-white/5 to-black/20 p-3 shadow-[0_12px_30px_rgba(251,191,36,0.18)] sm:w-[220px]"
                            >
                              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">Top {idx + 1}</div>
                              <img
                                src={item.imageUrl?.trim() ? item.imageUrl : FALLBACK_FRAGRANCE_IMG}
                                alt={item.name}
                                className="h-28 w-full rounded-xl border border-white/15 object-cover bg-white/5"
                                loading="lazy"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  if (img.dataset.fallbackApplied === "1") return;
                                  img.dataset.fallbackApplied = "1";
                                  img.src = FALLBACK_FRAGRANCE_IMG;
                                }}
                              />
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
                      <div className="mt-1 text-xs text-white/60">
                        {profile.isVisible ? "Fragrances this user has added." : "Follow to view this collection."}
                      </div>
                      {!profile.isVisible ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                          This collection is hidden because the account is private.
                        </div>
                      ) : !profile.collectionItems?.length ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                          No fragrances in this collection yet.
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {profile.collectionItems.map((item) => (
                            <button
                              type="button"
                              key={`${item.source}:${item.externalId}`}
                              onClick={() => openFragranceDetail(item.source, item.externalId)}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left"
                            >
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
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-white/90">{item.name}</div>
                                  <div className="truncate text-xs text-white/60">{item.brand || "—"}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {activeTab === "reviews" ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-sm font-semibold">Reviews</div>
                    <div className="mt-1 text-xs text-white/60">
                      {profile.isVisible
                        ? `${profile.displayName || profile.username} has posted ${profile.reviewCount} review(s).`
                        : "Follow to view this user's reviews."}
                    </div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                      Dedicated public review list is being wired next.
                    </div>
                  </div>
                ) : null}

                {activeTab === "wishlist" ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-sm font-semibold">Wishlist</div>
                    <div className="mt-1 text-xs text-white/60">
                      {profile.isVisible ? "Fragrances this user wants to try later." : "Follow to view this user's wishlist."}
                    </div>
                    {!profile.isVisible ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                        Wishlist is hidden because the account is private.
                      </div>
                    ) : !profile.wishlistItems?.length ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                        No fragrances in wishlist yet.
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {profile.wishlistItems.map((item) => (
                          <button
                            type="button"
                            key={`${item.source}:${item.externalId}`}
                            onClick={() => openFragranceDetail(item.source, item.externalId)}
                            className="group relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/12 via-sky-500/8 to-blue-500/10 p-3 text-left shadow-[0_10px_30px_rgba(56,189,248,0.14)]"
                          >
                            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-200/10 blur-2xl" />
                            <div className="relative flex items-center gap-3">
                              <img
                                src={item.imageUrl?.trim() ? item.imageUrl : FALLBACK_FRAGRANCE_IMG}
                                alt={item.name}
                                className="h-16 w-16 rounded-xl border border-white/15 object-cover bg-white/5"
                                loading="lazy"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  if (img.dataset.fallbackApplied === "1") return;
                                  img.dataset.fallbackApplied = "1";
                                  img.src = FALLBACK_FRAGRANCE_IMG;
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-white/95">{item.name}</div>
                                <div className="truncate text-xs text-white/70">{item.brand || "—"}</div>
                                <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-cyan-100/80">Wishlist</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === "community" ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-sm font-semibold">Community Fragrances</div>
                    <div className="mt-1 text-xs text-white/60">
                      {profile.isVisible
                        ? `${profile.displayName || profile.username} has contributed ${profile.communityFragranceCount} fragrance(s).`
                        : "Follow to view community contributions."}
                    </div>
                    {!profile.isVisible ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                        Community contributions are hidden because this account is private.
                      </div>
                    ) : !profile.communityFragrances?.length ? (
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                        No community fragrances contributed yet.
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {profile.communityFragrances.map((item) => (
                          <button
                            type="button"
                            key={`${item.source}:${item.externalId}`}
                            onClick={() => openFragranceDetail(item.source, item.externalId)}
                            className="rounded-2xl border border-white/10 bg-black/20 p-3 text-left"
                          >
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
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-white/90">{item.name}</div>
                                <div className="truncate text-xs text-white/60">{item.brand || "—"}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title ?? "Confirm"}
        description={pendingConfirm?.message ?? ""}
        confirmLabel="Confirm"
        cancelLabel="Keep Following"
        onCancel={() => setPendingConfirm(null)}
        onConfirm={runToggleFollow}
        loading={actionLoading}
      />
    </div>
  );
}
