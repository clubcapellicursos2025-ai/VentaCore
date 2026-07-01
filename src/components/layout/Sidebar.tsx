"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  Settings, 
  Briefcase, 
  Tag, 
  FileText, 
  AlertTriangle, 
  Sparkles,
  ChevronRight,
  ChevronDown,
  BarChart2,
  PieChart,
  ShieldAlert,
  LogOut
} from "lucide-react";
import { logout } from "@/actions/auth";

export function Sidebar() {
  const pathname = usePathname();
  const [openReports, setOpenReports] = useState(true);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, badge: null },
    { href: "/clients", label: "Clientes", icon: Users, badge: null },
    { href: "/vendors", label: "Vendedores", icon: Briefcase, badge: null },
    { href: "/moras", label: "Moras y Cobranza", icon: AlertTriangle, badge: "Prioridad", badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
    { href: "/imports", label: "Importaciones DB", icon: Database, badge: "IA", badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  ];

  const reportSubItems = [
    { href: "/reports", label: "Analítica General", icon: BarChart2 },
    { href: "/moras", label: "Top Deudores & Moras", icon: PieChart },
    { href: "/audit", label: "Auditoría & Lotes", icon: ShieldAlert, badge: "Sec" },
  ];

  const isReportsActive = pathname?.startsWith("/reports") || pathname?.startsWith("/audit");

  return (
    <div className="w-64 border-r border-slate-800/80 bg-slate-950/90 flex flex-col h-full shrink-0 shadow-xl select-none">
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-white text-base">
            V
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            VentaCore
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
          v2.5
        </span>
      </div>
      
      <div className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
        Navegación Principal
      </div>

      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group relative ${
                isActive 
                  ? "bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-transparent text-white border-l-4 border-blue-500 shadow-sm" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"
                }`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${item.badgeColor || "bg-slate-800 text-slate-400 border-slate-700"}`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </div>
            </Link>
          );
        })}

        {/* Submenú Desplegable: Reportes y Analítica */}
        <div className="pt-1">
          <button
            onClick={() => setOpenReports(!openReports)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
              isReportsActive
                ? "bg-gradient-to-r from-cyan-600/20 via-blue-600/10 to-transparent text-white border-l-4 border-cyan-500 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                isReportsActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400"
              }`} />
              <span>Reportes & Analítica</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold border bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                Nuevo
              </span>
              {openReports ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openReports && (
            <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-800 space-y-1">
              {reportSubItems.map((sub) => {
                const SubIcon = sub.icon;
                const isSubActive = pathname === sub.href;
                return (
                  <Link
                    key={sub.label}
                    href={sub.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isSubActive
                        ? "bg-slate-800/80 text-cyan-400 font-semibold shadow-inner"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SubIcon className={`w-4 h-4 ${isSubActive ? "text-cyan-400" : "text-slate-500"}`} />
                      <span>{sub.label}</span>
                    </div>
                    {sub.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        {sub.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 space-y-2">
        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 shadow-inner">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs text-white">Inteligencia Comercial</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Cuentas Corrientes consolidadas L'Oréal, Key Full y Wella en un solo historial.
          </p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all shadow-sm group cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span>Cerrar Sesión</span>
          </button>
        </form>
      </div>
    </div>
  );
}
