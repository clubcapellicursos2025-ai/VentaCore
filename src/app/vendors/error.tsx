"use client";

import React, { useEffect } from "react";
import { Briefcase, RefreshCw, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function VendorsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VentaCore Vendors Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/10">
          <Briefcase className="w-8 h-8 text-purple-500" />
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white mb-2">
          Error en Módulo de Vendedores
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          No se pudo sincronizar las carteras comerciales o calcular las comisiones y moras del equipo de ventas. Revisa la conectividad del servidor o intenta nuevamente.
        </p>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-6 text-left">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Detalle Técnico:</span>
          </div>
          <p className="text-xs text-slate-400 font-mono break-all line-clamp-3">
            {error.message || "Fallo en consulta de tabla vendors o relación de facturas."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/20 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
