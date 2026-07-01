import FileUploader from "@/components/features/imports/FileUploader";
import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ClearDatabaseButton from "./ClearDatabaseButton";
import DeleteImportButton from "./DeleteImportButton";

export default async function ImportsPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("import_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importaciones</h1>
          <p className="text-slate-400 mt-1">Sube los reportes del ERP (L'Oréal, Key Full, Wella) para sincronizar la base de datos.</p>
        </div>
        <ClearDatabaseButton />
      </div>

      {/* Carga Nueva */}
      <FileUploader />

      {/* Historial de Cargas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-10">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
          <h2 className="font-semibold text-white">Historial de Importaciones</h2>
          <span className="text-xs text-slate-400">Total: {jobs?.length || 0}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950/80">
              <tr>
                <th className="px-6 py-3 font-medium text-slate-400">Archivo</th>
                <th className="px-6 py-3 font-medium text-slate-400">Estado</th>
                <th className="px-6 py-3 font-medium text-slate-400">Tipo</th>
                <th className="px-6 py-3 font-medium text-slate-400">Clientes</th>
                <th className="px-6 py-3 font-medium text-slate-400">Facturas</th>
                <th className="px-6 py-3 font-medium text-slate-400">Deuda Total</th>
                <th className="px-6 py-3 font-medium text-slate-400">Saldo Total</th>
                <th className="px-6 py-3 font-medium text-slate-400">Tiempo</th>
                <th className="px-6 py-3 font-medium text-slate-400">Fecha de Carga</th>
                <th className="px-6 py-3 font-medium text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {jobs?.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-200 truncate max-w-[200px]" title={job.filename}>
                    {job.filename}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      job.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : job.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {job.status === 'completed' ? 'Completado' : job.status === 'failed' ? 'Fallido' : 'Procesando'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {job.doc_type}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {job.total_clients || 0}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {job.total_invoices || 0}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    ${(job.total_amount || 0).toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    ${(job.total_balance || 0).toLocaleString('es-AR')}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {job.processing_time_ms ? `${(job.processing_time_ms / 1000).toFixed(1)}s` : '-'}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {format(new Date(job.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    <DeleteImportButton jobId={job.id} />
                  </td>
                </tr>
              ))}
              
              {(!jobs || jobs.length === 0) && (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                    No hay importaciones registradas aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
