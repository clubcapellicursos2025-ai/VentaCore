"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  type?: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
  buttonText?: string;
}

export default function AlertModal({
  isOpen,
  type = "info",
  title,
  message,
  details,
  onClose,
  buttonText = "Entendido",
}: AlertModalProps) {
  if (!isOpen) return null;

  const getConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-12 h-12 text-emerald-400" />,
          bgGradient: "from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30",
          glow: "bg-emerald-500/20",
          buttonBg: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25",
          badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "error":
        return {
          icon: <XCircle className="w-12 h-12 text-rose-400" />,
          bgGradient: "from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30",
          glow: "bg-rose-500/20",
          buttonBg: "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/25",
          badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-12 h-12 text-amber-400" />,
          bgGradient: "from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/30",
          glow: "bg-amber-500/20",
          buttonBg: "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-amber-500/25",
          badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      default:
        return {
          icon: <Info className="w-12 h-12 text-blue-400" />,
          bgGradient: "from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30",
          glow: "bg-blue-500/20",
          buttonBg: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25",
          badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        };
    }
  };

  const config = getConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn p-4">
      <div className={`relative w-full max-w-md p-6 rounded-2xl bg-gradient-to-b ${config.bgGradient} border bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden text-left transform transition-all animate-scaleUp`}>
        {/* Glow */}
        <div className={`absolute -top-16 -right-16 w-36 h-36 ${config.glow} rounded-full blur-3xl pointer-events-none`} />

        {/* Close icon top right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with icon */}
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner shrink-0">
            {config.icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight leading-tight">
              {title}
            </h3>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.badgeBg}`}>
              {type === "success" ? "Operación Exitosa" : type === "error" ? "Error de Procesamiento" : "Información del Sistema"}
            </span>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          {message}
        </p>

        {/* Optional Details Box */}
        {details && (
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 mb-6 max-h-36 overflow-y-auto font-mono">
            {details}
          </div>
        )}

        {/* Footer Action Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`w-full py-3 px-6 rounded-xl font-semibold text-sm shadow-lg transition-all transform active:scale-[0.98] ${config.buttonBg}`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
