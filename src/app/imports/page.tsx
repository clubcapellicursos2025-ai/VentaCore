import PdfUploader from "@/components/features/imports/PdfUploader";
import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function ImportsPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("import_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importaciones</h1>
        <p className="text-slate-400 mt-1">Sube los reportes del ERP para sincronizar la base de datos.</p>
      </div>

      {/* Carga Nueva */}
      <PdfUploader />

      {/* Historial de Cargas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-10">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h2 className="font-semibold text-white">Historial de Importaciones</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80">
            <tr>
              <th className="px-6 py-3 font-medium text-slate-400">Archivo</th>
              <th className="px-6 py-3 font-medium text-slate-400">Estado</th>
              <th className="px-6 py-3 font-medium text-slate-400">Tipo de Documento</th>
              <th className="px-6 py-3 font-medium text-slate-400">Fecha de Carga</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {jobs?.map((job) => (
              <tr key={job.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-200">
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
                  {job.doc_type === 'resumen_cuenta' ? 'Resumen de Cuenta' : job.doc_type}
                </td>
                <td className="px-6 py-3 text-slate-400">
                  {format(new Date(job.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </td>
              </tr>
            ))}
            
            {(!jobs || jobs.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No hay importaciones registradas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
