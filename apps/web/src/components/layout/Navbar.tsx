import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authSignOut } from "@/lib/auth";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/api/me";

const ONBOARDED_KEY = "stacta:onboardedSub";

const NAV_ITEMS = [
  { label: "Home", to: "/home" },
  { label: "Search", to: "/search" },
  { label: "Users", to: "/users" },
  { label: "Notifications", to: "/notifications" },
  { label: "Profile", to: "/profile" },
] as const;

const MOBILE_NAV_ITEMS = [
  { label: "Home", to: "/home" },
  { label: "Search", to: "/search" },
  { label: "Alerts", to: "/notifications" },
  { label: "Users", to: "/users" },
  { label: "Me", to: "/profile" },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/home") return pathname === "/home" || pathname === "/collection";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function Navbar() {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setIsAdmin(Boolean(me.isAdmin));
      })
      .catch(() => {
        if (cancelled) return;
        setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeLabel = useMemo(() => {
    const item = [...NAV_ITEMS, ...(isAdmin ? [{ label: "Admin", to: "/admin/note-reports" as const }] : [])]
      .find((it) => isActive(pathname, it.to));
    return item?.label ?? "Workspace";
  }, [pathname, isAdmin]);

  async function onSignOut() {
    try {
      localStorage.removeItem(ONBOARDED_KEY);
      await authSignOut();
    } finally {
      window.location.href = "/sign-in";
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="pointer-events-auto mx-auto flex w-full max-w-7xl flex-col gap-2 rounded-2xl border border-white/15 bg-black/35 px-3 py-2 text-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="rounded-xl border border-amber-200/30 bg-gradient-to-br from-amber-300/35 to-orange-500/30 px-2 py-1 text-[10px] font-black tracking-[0.15em] text-amber-100">
            STACTA
          </div>
          <div className="hidden text-xs text-white/70 sm:block">{activeLabel}</div>
          <Button
            variant="secondary"
            className="h-8 rounded-xl border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20 sm:hidden"
            onClick={onSignOut}
          >
            Sign out
          </Button>
        </div>

        <div className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto sm:hidden">
          {[...MOBILE_NAV_ITEMS, ...(isAdmin ? [{ label: "Admin", to: "/admin/note-reports" as const }] : [])].map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={`m-${item.to}`}
                to={item.to}
                className={[
                  "shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border border-amber-200/35 bg-amber-300/20 text-amber-100"
                    : "border border-transparent text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="no-scrollbar hidden w-full items-center gap-1 overflow-x-auto sm:flex sm:w-auto sm:max-w-none">
          {[...NAV_ITEMS, ...(isAdmin ? [{ label: "Admin", to: "/admin/note-reports" as const }] : [])].map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border border-amber-200/35 bg-amber-300/20 text-amber-100"
                    : "border border-transparent text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <Button
          variant="secondary"
          className="hidden h-8 rounded-xl border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20 sm:inline-flex"
          onClick={onSignOut}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
