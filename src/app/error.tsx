"use client";

import React, { useEffect } from "react";
import { ShieldAlert, RefreshCw, Home, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VentaCore Root Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          Interrupción en el Sistema
        </h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Ocurrió un error inesperado al procesar la solicitud en el servidor. Hemos registrado el incidente para salvaguardar los datos de cobranza.
        </p>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-6 text-left">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Detalle Técnico:</span>
          </div>
          <p className="text-xs text-slate-400 font-mono break-all line-clamp-3">
            {error.message || "Error desconocido en el servidor de base de datos o autenticación."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar Carga
          </button>
          
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            Ir al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
