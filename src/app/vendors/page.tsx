import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { differenceInDays } from "date-fns";

export default async function VendorsPage() {
  const supabase = await createClient();
  const today = new Date();

  // Obtener vendedores y calcular cuántos clientes y facturas tienen.
  // Además, agrupamos las facturas asociadas a este vendedor para la deuda.
  const { data: rawVendors } = await supabase
    .from("vendors")
    .select(`
      id,
      name,
      vendor_code,
      invoices (
        balance_amount,
        client_id,
        due_date
      )
    `);

  // Procesamos para calcular deuda vencida y ordenamos por mayor urgencia
  const vendors = (rawVendors || []).map((vendor) => {
    let totalDebt = 0;
    let overdueDebt = 0;
    
    vendor.invoices.forEach((inv: any) => {
      const balance = Number(inv.balance_amount);
      totalDebt += balance;
      
      const dueDate = new Date(inv.due_date);
      if (differenceInDays(today, dueDate) > 0) {
        overdueDebt += balance;
      }
    });

    const uniqueClients = new Set(vendor.invoices.map((inv: any) => inv.client_id)).size;
    const overduePercentage = totalDebt > 0 ? (overdueDebt / totalDebt) * 100 : 0;

    return {
      ...vendor,
      totalDebt,
      overdueDebt,
      uniqueClients,
      overduePercentage
    };
  }).sort((a, b) => b.overdueDebt - a.overdueDebt); // Ordenar por mayor deuda vencida

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendedores</h1>
          <p className="text-slate-400 mt-1">Gestión de la fuerza de ventas y carteras asignadas.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-400">Vendedor</th>
              <th className="px-6 py-4 font-medium text-slate-400">Clientes Asignados</th>
              <th className="px-6 py-4 font-medium text-slate-400 text-right">Deuda Vencida</th>
              <th className="px-6 py-4 font-medium text-slate-400 text-right">Deuda Total</th>
              <th className="px-6 py-4 font-medium text-slate-400 w-32">Estado Cartera</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {vendors?.map((vendor) => {
              return (
                <tr key={vendor.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/vendors/${vendor.id}`} className="font-medium text-slate-200 hover:text-emerald-400 transition-colors">
                      {vendor.name}
                    </Link>
                    <div className="text-xs text-slate-500 font-mono mt-1">Cód: {vendor.vendor_code}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {vendor.uniqueClients} {vendor.uniqueClients === 1 ? 'cliente' : 'clientes'}
                  </td>
                  <td className={`px-6 py-4 font-medium text-right ${vendor.overdueDebt > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    ${vendor.overdueDebt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 font-medium text-right text-emerald-400">
                    ${vendor.totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div 
                          className="bg-red-500 h-1.5 rounded-full" 
                          style={{ width: `${Math.min(vendor.overduePercentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-500 text-right">{vendor.overduePercentage.toFixed(0)}% vencido</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {(!vendors || vendors.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No hay vendedores registrados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
