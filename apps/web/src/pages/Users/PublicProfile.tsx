import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getUserProfile } from "@/lib/api/users";
import type { UserProfileResponse } from "@/lib/api/types";

function getInitials(value: string) {
  const v = value.trim();
  if (!v) return "U";
  return v.slice(0, 2).toUpperCase();
}

export default function PublicProfilePage() {
  const navigate = useNavigate();
  const { username = "" } = useParams();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-7 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
            <p className="mt-1 text-sm text-white/60">Viewing @{username}</p>
          </div>
          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
            onClick={() => navigate("/users")}
          >
            Back to users
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
            {loading && <div className="text-sm text-white/65">Loading...</div>}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && profile && (
              <div className="space-y-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-5">
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
                        <div className="rounded-full border border-cyan-300/35 bg-cyan-400/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-100">
                          @{profile.username}
                        </div>
                        <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                          {profile.isPrivate ? "Private" : "Public"}
                        </div>
                      </div>

                      {!profile.isVisible ? (
                        <div className="mt-3 max-w-xl rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
                          This account is private. Send a follow request to see more.
                        </div>
                      ) : (
                        <div className="mt-3 max-w-xl whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/85">
                          {profile.bio?.trim() ? profile.bio : "No bio yet."}
                        </div>
                      )}
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
                        disabled
                      >
                        Follow soon
                      </Button>
                    )}
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Collections</div>
                    <div className="mt-1 text-lg font-semibold">—</div>
                    <div className="mt-1 text-xs text-white/45">Coming soon</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Reviews</div>
                    <div className="mt-1 text-lg font-semibold">—</div>
                    <div className="mt-1 text-xs text-white/45">Coming soon</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Followers</div>
                    <div className="mt-1 text-lg font-semibold">—</div>
                    <div className="mt-1 text-xs text-white/45">Coming soon</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur">
            <div className="mb-4">
              <div className="text-sm font-semibold">Profile details</div>
              <div className="mt-1 text-xs text-white/60">Visibility and account context.</div>
            </div>

            {loading && <div className="text-sm text-white/65">Loading...</div>}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && profile && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-white/60">Username</div>
                  <div className="mt-1 text-sm text-white/80">@{profile.username}</div>
                </div>

                <div>
                  <div className="text-xs font-medium text-white/60">Visibility</div>
                  <div className="mt-1 text-sm text-white/80">
                    {profile.isPrivate ? "Private profile" : "Public profile"}
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/65">
                  {profile.isVisible
                    ? "This profile is currently visible to you."
                    : "Profile content is hidden because this account is private."}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
