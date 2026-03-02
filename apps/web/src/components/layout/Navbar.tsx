import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, House, Search, Shield, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authSignOut } from "@/lib/auth";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/api/me";
import { getUnreadNotificationsCount } from "@/lib/api/notifications";

const ONBOARDED_KEY = "stacta:onboardedSub";

const NAV_ITEMS = [
  { label: "Home", to: "/home" },
  { label: "Fragrances", to: "/search" },
  { label: "Profiles", to: "/users" },
  { label: "Notifications", to: "/notifications" },
  { label: "Profile", to: "/profile" },
] as const;

const MOBILE_NAV_ITEMS = [
  { label: "Home", to: "/home", Icon: House },
  { label: "Search", to: "/search", Icon: Search },
  { label: "People", to: "/users", Icon: Users },
  { label: "Alerts", to: "/notifications", Icon: Bell },
  { label: "Me", to: "/profile", Icon: User },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/home") return pathname === "/home" || pathname === "/collection";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function Navbar() {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    let cancelled = false;

    const refreshUnread = async () => {
      try {
        const res = await getUnreadNotificationsCount();
        if (cancelled) return;
        setUnreadCount(Math.max(0, Number(res?.count ?? 0)));
      } catch {
        if (cancelled) return;
        setUnreadCount(0);
      }
    };

    void refreshUnread();
    const id = window.setInterval(() => {
      void refreshUnread();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname]);

  const unreadLabel = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

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
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <div className="pointer-events-auto mx-auto flex w-full max-w-7xl flex-col gap-2 rounded-2xl border border-white/15 bg-black/35 px-3 py-2 text-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <img
            src="/stacta.png"
            alt="Stacta"
            className="h-8 w-8 object-contain"
          />
          <div className="text-xs text-white/70">{activeLabel}</div>
          <Button
            variant="secondary"
            className="h-8 rounded-xl border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20 sm:hidden"
            onClick={onSignOut}
          >
            Sign out
          </Button>
        </div>

        <div className="no-scrollbar hidden w-full items-center gap-1 overflow-x-auto sm:flex sm:w-auto sm:max-w-none">
          {[...NAV_ITEMS, ...(isAdmin ? [{ label: "Admin", to: "/admin/note-reports" as const }] : [])].map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "relative shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                  active
                    ? "border border-amber-200/35 bg-amber-300/20 text-amber-100"
                    : "border border-transparent text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                {item.label}
                {item.to === "/notifications" && unreadLabel ? (
                  <span className="absolute -right-1 -top-1 rounded-full border border-white/25 bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {unreadLabel}
                  </span>
                ) : null}
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

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] sm:hidden">
        <div className="pointer-events-auto mx-auto flex w-full max-w-7xl items-center justify-between rounded-2xl border border-white/15 bg-black/45 px-2 py-1.5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {[...MOBILE_NAV_ITEMS, ...(isAdmin ? [{ label: "Admin", to: "/admin/note-reports" as const, Icon: Shield }] : [])].map((item) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={`m-${item.to}`}
                to={item.to}
                aria-label={item.label}
                className={[
                  "relative inline-flex h-12 w-12 items-center justify-center rounded-xl transition",
                  active
                    ? "bg-amber-300/20 text-amber-100"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                <item.Icon className="h-5 w-5" />
                {item.to === "/notifications" && unreadLabel ? (
                  <span className="absolute right-1 top-1 rounded-full border border-white/25 bg-rose-500 px-1 py-0 text-[10px] font-bold leading-none text-white">
                    {unreadLabel}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
