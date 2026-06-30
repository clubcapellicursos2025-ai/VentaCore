import { createClient } from "@/utils/supabase/server";

export default async function BrandsPage() {
  const supabase = await createClient();

  // Obtener marcas y calcular deuda
  const { data: brands } = await supabase
    .from("brands")
    .select(`
      id,
      name,
      invoices (
        balance_amount
      )
    `)
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marcas</h1>
          <p className="text-slate-400 mt-1">Gestión de marcas, laboratorios o divisiones representadas.</p>
        </div>
        <button className="bg-white text-slate-950 hover:bg-slate-200 transition-colors px-4 py-2 rounded-md font-medium text-sm">
          Nueva Marca
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-400">Marca</th>
              <th className="px-6 py-4 font-medium text-slate-400 text-right">Facturación Pendiente (Deuda)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {brands?.map((brand) => {
              const totalDebt = brand.invoices.reduce((acc: number, inv: any) => acc + Number(inv.balance_amount), 0);
              
              return (
                <tr key={brand.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-200">{brand.name}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-right text-emerald-400">
                    ${totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
            
            {(!brands || brands.length === 0) && (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                  No hay marcas registradas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
