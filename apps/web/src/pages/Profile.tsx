import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import ProfilePhotoPicker from "@/components/profile/ProfilePhotoPicker";
import { getMe, updateMe } from "@/lib/api/me";
import type { MeResponse } from "@/lib/api/types";

function formatDate(value?: string | null) {
  if (!value) return "—";
  // backend might already send ISO; keep simple + safe
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function initials(name?: string | null) {
  const n = (name || "").trim();
  if (!n) return "S";
  const parts = n.split(/\s+/).slice(0, 2);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "S";
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

export default function ProfilePage() {
  const navigate = useNavigate();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftIsPrivate, setDraftIsPrivate] = useState(false);

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

  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-5xl px-4 pb-10">
        {/* Top bar */}
        <div className="mb-7 flex items-center justify-between rounded-3xl border border-white/15 bg-black/30 p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-amber-200/80">Identity</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">My profile</h1>
            <p className="mt-1 text-sm text-white/65">
              Keep your identity polished and control who can see your profile.
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main card */}
          <div className="rounded-3xl border border-white/15 bg-white/6 p-6 backdrop-blur">
            {loading && <div className="text-sm text-white/70">Loading...</div>}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && me && (
              <div className="space-y-6">
                {/* Profile header */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-5">
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
                            <div className="rounded-full border border-cyan-300/35 bg-cyan-400/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-100">
                              {usernameLabel}
                            </div>
                            <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                              {me.isPrivate ? "Private" : "Public"}
                            </div>
                          </div>

                          <div className="mt-3 max-w-xl whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/85">
                            {me.bio?.trim() ? me.bio : (
                              <span className="text-white/50">
                                Add a bio so people know what you’re into.
                              </span>
                            )}
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

                          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                            <div>
                              <div className="text-xs font-semibold text-white/85">Private profile</div>
                              <div className="mt-0.5 text-[11px] text-white/55">
                                Only approved followers can see profile activity.
                              </div>
                            </div>
                            <PrivacyToggle checked={draftIsPrivate} onChange={setDraftIsPrivate} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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

                {/* “Stats” row (placeholder) */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Following</div>
                    <div className="mt-1 text-lg font-semibold">{me.followingCount}</div>
                    <div className="mt-1 text-xs text-white/45">Accounts you follow</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Followers</div>
                    <div className="mt-1 text-lg font-semibold">{me.followersCount}</div>
                    <div className="mt-1 text-xs text-white/45">People following you</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/60">Visibility</div>
                    <div className="mt-1 text-lg font-semibold">{me.isPrivate ? "Private" : "Public"}</div>
                    <div className="mt-1 text-xs text-white/45">Who can access your profile</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side card: account details */}
          <div className="rounded-3xl border border-white/15 bg-white/6 p-6 backdrop-blur">
            <div className="mb-4">
              <div className="text-sm font-semibold">Account</div>
              <div className="mt-1 text-xs text-white/60">
                Technical details from your backend user row.
              </div>
            </div>

            {loading && <div className="text-sm text-white/70">Loading...</div>}

            {!loading && !error && me && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-white/60">User id</div>
                  <div className="mt-1 break-all text-xs text-white/70">{me.id}</div>
                </div>

                <div>
                  <div className="text-xs font-medium text-white/60">Cognito sub</div>
                  <div className="mt-1 break-all text-xs text-white/70">{me.cognitoSub}</div>
                </div>

                <Separator className="bg-white/10" />

                <div className="grid gap-3">
                  <div>
                    <div className="text-xs font-medium text-white/60">Created</div>
                    <div className="mt-1 text-xs text-white/70">{formatDate(me.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white/60">Updated</div>
                    <div className="mt-1 text-xs text-white/70">{formatDate(me.updatedAt)}</div>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <Button
                    variant="secondary"
                    className="h-10 w-full rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
                    onClick={() => navigate("/settings")}
                >
                  Profile settings
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
