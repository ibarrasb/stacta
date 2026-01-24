import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "@/lib/auth";

export default function RedirectIfAuthed({
  children,
  to = "/home",
}: {
  children: React.ReactNode;
  to?: string;
}) {
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

  if (status === "authed") return <Navigate to={to} replace />;
  return <>{children}</>;
}
