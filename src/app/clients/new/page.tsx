import Link from "next/link";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Cliente</h1>
          <p className="text-slate-400 mt-1">Ingresa los datos para registrar un cliente manualmente.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="text-center py-12 text-slate-400">
          <p className="mb-4">El formulario de creación manual está en construcción.</p>
          <p className="text-sm">Por ahora, utiliza el módulo de <Link href="/imports" className="text-emerald-400 hover:underline">Importaciones</Link> para cargar clientes en lote mediante PDFs.</p>
        </div>
        
        <div className="flex justify-end mt-6 pt-6 border-t border-slate-800">
          <Link 
            href="/clients" 
            className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Volver
          </Link>
          <button disabled className="bg-slate-800 text-slate-500 px-4 py-2 rounded-md font-medium text-sm cursor-not-allowed">
            Guardar Cliente
          </button>
        </div>
      </div>
    </div>
  );
}
