"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Sparkles, CheckCircle, Clock, Database, X, ShieldCheck, LogOut, User } from "lucide-react";
import { logout } from "@/actions/auth";

export function Topbar() {
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = [
    {
      id: 1,
      title: "Motor IA Activo",
      message: "Reconocimiento multifuente (L'Oréal, Key Full, Wella) en línea.",
      time: "En vivo",
      icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      id: 2,
      title: "Consolidación en Tiempo Real",
      message: "Saldos pendientes y cuentas corrientes unificados en Supabase.",
      time: "Automático",
      icon: <Database className="w-4 h-4 text-blue-400" />,
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: 3,
      title: "Cálculo de Moras al Día",
      message: "Los vencimientos de facturas (± 15 días y > 30 días) se monitorean continuamente.",
      time: "Activo",
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      id: 4,
      title: "Seguridad y Respaldo",
      message: "Historial de importaciones y saldos protegidos por lotes transaccionales.",
      time: "Sistema ok",
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Left side: System status pill instead of search */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sistema Inteligente Multifuente Sincronizado</span>
        </div>
      </div>
      
      {/* Right side: Notifications Dropdown */}
      <div className="flex items-center gap-4 relative" ref={notifRef}>
        <button 
          onClick={() => setShowNotifs(!showNotifs)}
          className={`p-2 rounded-xl transition-all relative ${
            showNotifs 
              ? "bg-slate-800 text-white shadow-lg" 
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
          title="Notificaciones del Sistema"
        >
          <Bell className="w-5 h-5 animate-wiggle" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full border-2 border-slate-950 animate-ping" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-gradient-to-tr from-cyan-500 to-blue-500 rounded-full border-2 border-slate-950" />
        </button>

        {/* Dropdown menu */}
        {showNotifs && (
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <h4 className="font-bold text-sm text-white">Notificaciones de Plataforma</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                4 Activas
              </span>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div 
                  key={n.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-start gap-3"
                >
                  <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${n.bg}`}>
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-semibold text-xs text-white truncate">{n.title}</h5>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">{n.time}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 text-center">
              <button 
                onClick={() => setShowNotifs(false)}
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Cerrar panel de notificaciones
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile & Logout */}
      <div className="flex items-center gap-3 pl-4 border-l border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-300 shadow-sm">
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-white leading-none">Administrador</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">VentaCore OS</div>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 transition-all shadow-sm cursor-pointer flex items-center gap-1.5 px-2.5"
            title="Cerrar Sesión y salir"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-semibold hidden md:inline">Salir</span>
          </button>
        </form>
      </div>
    </header>
  );
}
