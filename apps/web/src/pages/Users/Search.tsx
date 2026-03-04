import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { searchUsers } from "@/lib/api/users";
import type { UserSearchItem } from "@/lib/api/types";

const DEBOUNCE_MS = 220;
const RECENT_USERS_KEY = "stacta:recent-user-searches";
const MAX_RECENT_USERS = 8;

type RecentUserSearch = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
};

function initials(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "U";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "U";
}

function avatarTone(username: string) {
  const tones = [
    "from-rose-400/90 to-orange-300/80",
    "from-sky-400/90 to-cyan-300/80",
    "from-emerald-400/90 to-teal-300/80",
    "from-fuchsia-400/90 to-pink-300/80",
    "from-amber-400/90 to-yellow-300/80",
  ];
  const sum = username
    .toLowerCase()
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return tones[sum % tones.length];
}

export default function UsersSearchPage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<UserSearchItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentUserSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);

  const query = useMemo(() => searchText.trim(), [searchText]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_USERS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentUserSearch[];
      if (!Array.isArray(parsed)) return;
      const clean = parsed
        .filter((item) => item && typeof item.username === "string" && item.username.trim())
        .slice(0, MAX_RECENT_USERS)
        .map((item) => ({
          username: String(item.username).trim(),
          displayName: String(item.displayName || item.username).trim(),
          avatarUrl: typeof item.avatarUrl === "string" ? item.avatarUrl : null,
          isPrivate: Boolean(item.isPrivate),
        }));
      setRecentSearches(clean);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  function persistRecentSearches(next: RecentUserSearch[]) {
    setRecentSearches(next);
    localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(next));
  }

  function saveRecentSearch(user: Pick<UserSearchItem, "username" | "displayName" | "avatarUrl" | "isPrivate">) {
    const next: RecentUserSearch = {
      username: user.username.trim(),
      displayName: (user.displayName || user.username).trim(),
      avatarUrl: user.avatarUrl?.trim() ? user.avatarUrl : null,
      isPrivate: Boolean(user.isPrivate),
    };
    if (!next.username) return;
    setRecentSearches((prev) => {
      const withoutCurrent = prev.filter((item) => item.username.toLowerCase() !== next.username.toLowerCase());
      const updated = [next, ...withoutCurrent].slice(0, MAX_RECENT_USERS);
      localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function openUserProfile(user: Pick<UserSearchItem, "username" | "displayName" | "avatarUrl" | "isPrivate">) {
    saveRecentSearch(user);
    navigate(`/u/${user.username}`);
  }

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
    <div className="min-h-screen text-white stacta-fade-rise">
      <div className="mx-auto max-w-3xl px-4 pb-10">
        <div className="mb-6 flex items-center justify-between gap-3 rounded-3xl border border-white/15 bg-black/30 p-5">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-amber-200/80">Community</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Find users</h1>
            <p className="mt-1 text-sm text-white/65">
              Search by username or display name.
            </p>
          </div>
          <Button
            variant="secondary"
            className="h-10 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/18"
            onClick={() => navigate("/home")}
          >
            Back
          </Button>
        </div>

        <div className="rounded-3xl border border-white/15 bg-white/6 p-4">
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

          {loading && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-5">
              <LoadingSpinner label="Searching users..." />
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              {results.map((user) => (
                <button
                  key={user.username}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.07]"
                  onClick={() => openUserProfile(user)}
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

          {recentSearches.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Recent users</div>
                  <div className="text-[11px] text-white/45">Jump back into profiles you opened recently.</div>
                </div>
                <button
                  type="button"
                  className="text-xs text-white/55 transition hover:text-white"
                  onClick={() => persistRecentSearches([])}
                >
                  Clear all
                </button>
              </div>
              <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
                {recentSearches.map((user) => (
                  <button
                    key={`recent-story-${user.username}`}
                    type="button"
                    onClick={() => openUserProfile(user)}
                    className="group shrink-0 text-center"
                  >
                    <span
                      className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br p-[2px] ${avatarTone(
                        user.username,
                      )}`}
                    >
                      {user.avatarUrl?.trim() ? (
                        <img
                          src={user.avatarUrl}
                          alt={`${user.username} avatar`}
                          className="h-full w-full rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                          {initials(user.displayName || user.username)}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block max-w-20 truncate text-[11px] text-white/70 transition group-hover:text-white">
                      @{user.username}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
