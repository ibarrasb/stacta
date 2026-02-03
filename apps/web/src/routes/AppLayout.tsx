import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import GlobalBackground from "@/components/GlobalBackground";

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <div className="opacity-80">Loading…</div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <div className="min-h-screen text-white">
      <GlobalBackground />
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
