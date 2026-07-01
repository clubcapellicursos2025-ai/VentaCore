"use client";

import React from "react";
import { AlertTriangle, Trash2, HelpCircle, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  warningText,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
  isPending = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <Trash2 className="w-10 h-10 text-rose-400" />,
          bgGradient: "from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30",
          glow: "bg-rose-500/20",
          confirmBtn: "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/25",
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          badgeText: "Acción Destructiva",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-10 h-10 text-amber-400" />,
          bgGradient: "from-amber-500/20 via-yellow-500/10 to-transparent border-amber-500/30",
          glow: "bg-amber-500/20",
          confirmBtn: "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white shadow-amber-500/25",
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          badgeText: "Requiere Confirmación",
        };
      default:
        return {
          icon: <HelpCircle className="w-10 h-10 text-blue-400" />,
          bgGradient: "from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30",
          glow: "bg-blue-500/20",
          confirmBtn: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25",
          badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          badgeText: "Confirmación del Sistema",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fadeIn p-4">
      <div className={`relative w-full max-w-md p-6 rounded-2xl bg-gradient-to-b ${styles.bgGradient} border bg-slate-900/95 shadow-2xl backdrop-blur-xl overflow-hidden text-left transform transition-all animate-scaleUp`}>
        {/* Glow */}
        <div className={`absolute -top-16 -left-16 w-36 h-36 ${styles.glow} rounded-full blur-3xl pointer-events-none`} />

        {/* Close icon top right */}
        {!isPending && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header with icon */}
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner shrink-0">
            {styles.icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight leading-tight">
              {title}
            </h3>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles.badge}`}>
              {styles.badgeText}
            </span>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          {message}
        </p>

        {/* Warning Badge / Text if any */}
        {warningText && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 mb-6 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{warningText}</span>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="w-full sm:w-1/2 py-3 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`w-full sm:w-1/2 py-3 px-4 rounded-xl font-semibold text-sm shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${styles.confirmBtn}`}
          >
            {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
