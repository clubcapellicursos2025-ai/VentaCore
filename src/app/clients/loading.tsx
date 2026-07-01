import { Loader2 } from "lucide-react";

export default function ClientsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-8 w-72 bg-slate-800 rounded"></div>
          <div className="h-4 w-96 bg-slate-800/60 rounded mt-2"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-96 bg-slate-800 rounded-lg"></div>
          <div className="h-10 w-36 bg-slate-800 rounded-lg"></div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-8 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Cargando cartera oficial de clientes...</p>
      </div>
    </div>
  );
}
