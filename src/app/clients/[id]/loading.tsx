import { Loader2, Store } from "lucide-react";

export default function ClientLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 bg-slate-800 rounded-md"></div>
            <div className="h-6 w-28 bg-slate-800 rounded-full"></div>
          </div>
          <div className="h-4 w-96 bg-slate-800/80 rounded-md"></div>
          <div className="h-3 w-48 bg-slate-800/50 rounded-md"></div>
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="h-4 w-36 bg-slate-800 rounded"></div>
          <div className="h-8 w-32 bg-slate-800 rounded"></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="h-4 w-36 bg-slate-800 rounded"></div>
          <div className="h-8 w-32 bg-slate-800 rounded"></div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="h-4 w-36 bg-slate-800 rounded"></div>
          <div className="h-8 w-32 bg-slate-800 rounded"></div>
        </div>
      </div>

      {/* Origin Groups Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-sm font-medium text-slate-300">
            Cargando historial de cuentas corrientes y facturas...
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="h-6 w-48 bg-slate-800 rounded"></div>
          <div className="space-y-2">
            <div className="h-10 w-full bg-slate-800/60 rounded"></div>
            <div className="h-10 w-full bg-slate-800/40 rounded"></div>
            <div className="h-10 w-full bg-slate-800/20 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
