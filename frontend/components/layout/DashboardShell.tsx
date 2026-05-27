"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { User } from "@/store/slices/authSlice";

interface Props {
  children: React.ReactNode;
  user: User;
}

export function DashboardShell({ children, user }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          user={user}
          onToggleSidebar={() => setSidebarOpen((p) => !p)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}