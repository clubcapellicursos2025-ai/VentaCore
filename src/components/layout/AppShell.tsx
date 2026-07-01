"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Omnibar } from "@/components/features/search/Omnibar";
import { SplashScreen } from "@/components/layout/SplashScreen";

export function AppShell({
  children,
  clients = [],
}: {
  children: React.ReactNode;
  clients: { id: string; name: string; client_code: string }[];
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <>
      <SplashScreen />
      {isLoginPage ? (
        <main className="flex-1 min-w-0 w-full max-w-full">
          {children}
        </main>
      ) : (
        <>
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Topbar />
            <Omnibar clients={clients} />
            <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto min-w-0 w-full max-w-full">
              {children}
            </main>
          </div>
        </>
      )}
    </>
  );
}
