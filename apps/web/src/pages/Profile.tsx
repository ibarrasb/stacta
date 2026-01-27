import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getMe } from "@/lib/api/me";
import type { MeResponse } from "@/lib/api/types";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getMe();
        if (!cancelled) setMe(data);
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

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
            <p className="mt-1 text-sm text-white/60">Pulled from your backend user row.</p>
          </div>

          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
            onClick={() => navigate("/home")}
          >
            Back
          </Button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          {loading && <div className="text-sm text-white/70">Loading...</div>}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && me && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-medium text-white/60">Display name</div>
                <div className="mt-1 text-sm">{me.displayName || "—"}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-white/60">Username</div>
                <div className="mt-1 text-sm">{me.username ? `@${me.username}` : "—"}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-white/60">Bio</div>
                <div className="mt-1 text-sm text-white/80">{me.bio ?? "—"}</div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-white/60">User id</div>
                  <div className="mt-1 break-all text-xs text-white/70">{me.id}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-white/60">Cognito sub</div>
                  <div className="mt-1 break-all text-xs text-white/70">{me.cognitoSub}</div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-white/60">Created</div>
                  <div className="mt-1 text-xs text-white/70">{me.createdAt}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-white/60">Updated</div>
                  <div className="mt-1 text-xs text-white/70">{me.updatedAt}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
