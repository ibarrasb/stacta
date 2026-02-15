import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchUsers } from "@/lib/api/users";
import type { UserSearchItem } from "@/lib/api/types";

const DEBOUNCE_MS = 220;

export default function UsersSearchPage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<UserSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const query = useMemo(() => searchText.trim(), [searchText]);

  useEffect(() => {
    if (!query) {
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current?.abort();
      abortRef.current = ctrl;
      const seq = ++seqRef.current;

      setLoading(true);
      setError(null);

      try {
        const rows = await searchUsers({ q: query, limit: 15 }, { signal: ctrl.signal });
        if (seq !== seqRef.current) return;
        setResults(rows);
      } catch (e: any) {
        if (ctrl.signal.aborted || seq !== seqRef.current) return;
        setError(e?.message || "Failed to search users.");
      } finally {
        if (!ctrl.signal.aborted && seq === seqRef.current) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query]);

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Find users</h1>
            <p className="mt-1 text-sm text-white/60">
              Search by username or name.
            </p>
          </div>
          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/12 bg-white/10 text-white hover:bg-white/15"
            onClick={() => navigate("/home")}
          >
            Back
          </Button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="h-11 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/40"
            placeholder="Search @username or display name"
          />

          {error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {!query && (
            <div className="mt-4 text-sm text-white/55">Start typing to find people.</div>
          )}

          {query && !loading && results.length === 0 && !error && (
            <div className="mt-4 text-sm text-white/55">No users found.</div>
          )}

          {loading && <div className="mt-4 text-sm text-white/60">Searching...</div>}

          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              {results.map((user) => (
                <button
                  key={user.username}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.07]"
                  onClick={() => navigate(`/u/${user.username}`)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {user.displayName || user.username}
                      </div>
                      <div className="truncate text-xs text-white/60">@{user.username}</div>
                    </div>
                    {user.isPrivate && (
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                        Private
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
