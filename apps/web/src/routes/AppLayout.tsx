import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import GlobalBackground from "@/components/GlobalBackground";
import Navbar from "@/components/layout/Navbar";

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <div className="opacity-80">Loading…</div>
    </div>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const isAuthedRoute =
    pathname === "/home" ||
    pathname === "/collection" ||
    pathname === "/profile" ||
    pathname === "/search" ||
    pathname === "/users" ||
    pathname.startsWith("/notifications") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/support" ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/posts/") ||
    pathname.startsWith("/reviews/") ||
    pathname.startsWith("/fragrances/");

  return (
    <div className="min-h-screen text-white">
      <GlobalBackground />
      {isAuthedRoute ? <Navbar /> : null}
      <Suspense fallback={<RouteFallback />}>
        <div className={isAuthedRoute ? "pt-24 pb-[calc(env(safe-area-inset-bottom)+86px)] sm:pt-24 sm:pb-[env(safe-area-inset-bottom)]" : ""}>
          <Outlet />
        </div>
      </Suspense>
    </div>
  );
}
