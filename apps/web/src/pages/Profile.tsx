import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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

export default function ProfilePage() {
  const navigate = useNavigate();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftBio, setDraftBio] = useState("");

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
  }

  async function onSave() {
    if (!canSave || !me) return;
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMe({
        displayName: draftDisplayName.trim(),
        bio: draftBio.trim() || null,
      });
      setMe(updated);
      setDraftDisplayName(updated.displayName ?? "");
      setDraftBio(updated.bio ?? "");
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
            <p className="mt-1 text-sm text-white/60">
              Manage your public profile details.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
              onClick={() => navigate("/home")}
            >
              Back
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            {loading && <div className="text-sm text-white/70">Loading...</div>}

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && me && (
              <div className="space-y-6">
                {/* Profile header */}
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    {/* Avatar (placeholder) */}
                    <div className="relative">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white/90">
                          {initials(me.displayName)}
                        </div>
                      </div>

                      {/* “Change photo” placeholder */}
                      <div className="mt-2 text-center text-[11px] text-white/50">
                        Photo soon
                      </div>
                    </div>

                    {/* Name + username + bio */}
                    <div className="min-w-0">
                      {!isEditing ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="truncate text-xl font-semibold tracking-tight">
                              {me.displayName || "—"}
                            </div>
                            <div className="rounded-full border border-cyan-300/40 bg-cyan-400/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
                              {usernameLabel}
                            </div>
                          </div>

                          <div className="mt-2 max-w-xl whitespace-pre-wrap text-sm text-white/80">
                            {me.bio?.trim() ? me.bio : (
                              <span className="text-white/50">
                                Add a bio so people know what you’re into.
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <div className="mb-1 text-xs font-medium text-white/60">
                              Display name
                            </div>
                            <Input
                              value={draftDisplayName}
                              onChange={(e) => setDraftDisplayName(e.target.value)}
                              className="h-10 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                              placeholder="Your display name"
                              maxLength={120}
                            />
                            <div className="mt-1 text-xs text-white/45">
                              Up to 120 characters.
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 text-xs font-medium text-white/60">Bio</div>
                            <Textarea
                              value={draftBio}
                              onChange={(e) => setDraftBio(e.target.value)}
                              className="min-h-[96px] rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
                              placeholder="Tell people your vibe…"
                              maxLength={500}
                            />
                            <div className="mt-1 text-xs text-white/45">
                              {draftBio.length}/500
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
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
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">Collections</div>
                    <div className="mt-1 text-lg font-semibold">—</div>
                    <div className="mt-1 text-xs text-white/45">Coming soon</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">Reviews</div>
                    <div className="mt-1 text-lg font-semibold">—</div>
                    <div className="mt-1 text-xs text-white/45">Coming soon</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-white/60">Followers</div>
                    <div className="mt-1 text-lg font-semibold">—</div>
                    <div className="mt-1 text-xs text-white/45">Coming soon</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side card: account details */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
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
