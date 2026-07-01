"use client";

import React from "react";
import { Loader2, Sparkles, Database, Cpu } from "lucide-react";

interface LoadingOverlayProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  step?: "analyzing" | "saving" | "deleting" | "general";
}

export default function LoadingOverlay({
  isOpen,
  title = "Procesando operación...",
  message = "Por favor, espera un momento mientras el sistema trabaja.",
  step = "general",
}: LoadingOverlayProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (step) {
      case "analyzing":
        return <Sparkles className="w-10 h-10 text-cyan-400 animate-pulse" />;
      case "saving":
        return <Database className="w-10 h-10 text-emerald-400 animate-bounce" />;
      case "deleting":
        return <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />;
      default:
        return <Cpu className="w-10 h-10 text-indigo-400 animate-pulse" />;
    }
  };

  const getGradient = () => {
    switch (step) {
      case "analyzing":
        return "from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border-cyan-500/30";
      case "saving":
        return "from-emerald-500/20 via-teal-500/20 to-green-500/20 border-emerald-500/30";
      case "deleting":
        return "from-rose-500/20 via-red-500/20 to-orange-500/20 border-rose-500/30";
      default:
        return "from-indigo-500/20 via-purple-500/20 to-blue-500/20 border-indigo-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn transition-all duration-300">
      <div className={`relative w-full max-w-md p-8 mx-4 rounded-2xl bg-gradient-to-b ${getGradient()} border bg-slate-900/90 shadow-2xl backdrop-blur-xl text-center overflow-hidden`}>
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Icon Ring */}
        <div className="relative flex items-center justify-center w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-700/50 border-t-blue-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-slate-800 border-b-cyan-400 animate-spin animate-reverse" style={{ animationDuration: "3s" }} />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-900/80 shadow-inner border border-slate-700/50">
            {getIcon()}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-slate-300 mb-6 leading-relaxed max-w-xs mx-auto">
          {message}
        </p>

        {/* Modern Shimmer Progress Bar */}
        <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500 to-cyan-400 animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          Pantalla bloqueada hasta finalizar el proceso
        </div>
      </div>
    </div>
  );
}
