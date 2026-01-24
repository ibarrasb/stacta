import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken } from "@/lib/auth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "authed" | "nope">("checking");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const token = await getAccessToken();
        if (!alive) return;
        setStatus(token ? "authed" : "nope");
      } catch {
        if (!alive) return;
        setStatus("nope");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen grid place-items-center text-white">
        <div className="text-white/70">Loading…</div>
      </div>
    );
  }

  if (status === "nope") {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
