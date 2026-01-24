import { Outlet } from "react-router-dom";
import GlobalBackground from "@/components/GlobalBackground";

export default function AppLayout() {
  return (
    <div className="min-h-screen text-white">
      <GlobalBackground />
      <Outlet />
    </div>
  );
}
