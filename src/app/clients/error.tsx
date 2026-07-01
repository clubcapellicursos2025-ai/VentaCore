"use client";

import React, { useEffect } from "react";
import { Users, RefreshCw, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VentaCore Clients Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
          <Users className="w-8 h-8 text-amber-500" />
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white mb-2">
          Error en Directorio de Clientes
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          No se pudo consultar o cargar la cuenta corriente de este cliente. Puede deberse a un corte en la conexión con la base de datos de cobranza o un identificador no válido.
        </p>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 mb-6 text-left">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Detalle Técnico:</span>
          </div>
          <p className="text-xs text-slate-400 font-mono break-all line-clamp-3">
            {error.message || "Error en consulta SQL o permisos de cuenta comercial."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2.5 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          
          <Link
            href="/clients"
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Ver Todos
          </Link>
        </div>
      </div>
    </div>
  );
}
