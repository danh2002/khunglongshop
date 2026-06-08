import DashboardSidebar from "@/components/DashboardSidebar";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto flex min-h-screen max-w-screen-2xl max-lg:flex-col">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
