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
    pathname.startsWith("/u/") ||
    pathname.startsWith("/reviews/") ||
    pathname.startsWith("/fragrances/");

  return (
    <div className="min-h-screen text-white">
      <GlobalBackground />
      {isAuthedRoute ? <Navbar /> : null}
      <Suspense fallback={<RouteFallback />}>
        <div className={isAuthedRoute ? "pt-28 pb-[env(safe-area-inset-bottom)] sm:pt-24" : ""}>
          <Outlet />
        </div>
      </Suspense>
    </div>
  );
}
