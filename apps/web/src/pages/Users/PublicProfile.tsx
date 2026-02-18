import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import { followUser, unfollowUser } from "@/lib/api/follows";
import { getUserProfile } from "@/lib/api/users";
import type { UserProfileResponse } from "@/lib/api/types";

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

export default function PublicProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username = "" } = useParams();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ title: string; message: string } | null>(null);

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
            {loading && <div className="text-sm text-white/65">Loading...</div>}

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
                          ? "Working..."
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

                <div className="grid gap-3 sm:grid-cols-3">
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
                </div>

                <Separator className="bg-white/10" />

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
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {profile.topFragrances.map((item, idx) => (
                        <div
                          key={`${item.source}:${item.externalId}`}
                          className="rounded-2xl border border-amber-300/30 bg-gradient-to-b from-amber-300/15 via-white/5 to-black/20 p-3 shadow-[0_12px_30px_rgba(251,191,36,0.18)]"
                        >
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">Top {idx + 1}</div>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="h-28 w-full rounded-xl border border-white/15 object-cover" loading="lazy" />
                          ) : (
                            <div className="h-28 w-full rounded-xl border border-white/15 bg-white/5" />
                          )}
                          <div className="mt-2 truncate text-sm font-semibold text-white/95">{item.name}</div>
                          <div className="truncate text-xs text-white/70">{item.brand || "—"}</div>
                        </div>
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
                        <div key={`${item.source}:${item.externalId}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="flex items-center gap-3">
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
