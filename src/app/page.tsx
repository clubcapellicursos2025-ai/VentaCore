import { createClient } from "@/utils/supabase/server";
import { ClientCharts } from "@/components/features/dashboard/ClientCharts";
import { format, isPast, isFuture, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Obtener total de clientes
  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  // Obtener toda la deuda global relacional
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      balance_amount, 
      due_date,
      invoice_number,
      clients(name),
      brands(name),
      vendors(name)
    `);

  let globalDebt = 0;
  let riskClients = 0;
  const vendorMap = new Map<string, number>();
  const brandMap = new Map<string, number>();
  let upcomingInvoices: any[] = [];

  if (invoices) {
    const today = new Date();
    
    invoices.forEach((inv) => {
      const balance = Number(inv.balance_amount);
      globalDebt += balance;
      
      const dueDate = new Date(inv.due_date);
      const daysDiff = differenceInDays(dueDate, today);

      // Riesgo: Vencido por más de 30 días
      if (daysDiff < -30) {
        riskClients++;
      }

      // Próximos a vencer (o vencidos recientemente, e.g. entre -15 y +15 días)
      if (daysDiff >= -15 && daysDiff <= 15 && balance > 0) {
        upcomingInvoices.push({ ...inv, daysDiff, dueDate });
      }

      // Agrupar por Vendedor
      // @ts-ignore
      const vendorName = inv.vendors?.name || "Sin Vendedor";
      vendorMap.set(vendorName, (vendorMap.get(vendorName) || 0) + balance);

      // Agrupar por Marca
      // @ts-ignore
      const brandName = inv.brands?.name || "Otra";
      brandMap.set(brandName, (brandMap.get(brandName) || 0) + balance);
    });
  }

  // Ordenar próximos a vencer por fecha (los más urgentes/vencidos primero)
  upcomingInvoices.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Preparar datos para Recharts
  const vendorData = Array.from(vendorMap.entries())
    .map(([name, debt]) => ({ name, debt }))
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 10); // Top 10 vendedores

  const brandData = Array.from(brandMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard General</h1>
          <p className="text-slate-400 mt-1">Inteligencia comercial cruzada (Vendedores, Marcas y Clientes).</p>
        </div>
      </div>
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-900/50">
          <h3 className="text-sm font-medium text-slate-400">Total Clientes Activos</h3>
          <p className="text-3xl font-bold mt-2 text-white">{totalClients || 0}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-900/50">
          <h3 className="text-sm font-medium text-slate-400">Deuda Global en Calle</h3>
          <p className="text-3xl font-bold mt-2 text-emerald-400">
            ${globalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg shadow-slate-900/50">
          <h3 className="text-sm font-medium text-slate-400">Facturas Alto Riesgo (&gt;30 días)</h3>
          <p className="text-3xl font-bold mt-2 text-rose-500">{riskClients}</p>
        </div>
      </div>

      {/* Gráficos Recharts */}
      <ClientCharts vendorData={vendorData} brandData={brandData} />

      {/* Aging Report (Próximos a Vencer) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mt-6">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h3 className="font-semibold text-white">Radar de Cobranza (± 15 días)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80">
              <tr>
                <th className="px-6 py-3 font-medium text-slate-400">Cliente</th>
                <th className="px-6 py-3 font-medium text-slate-400">Factura</th>
                <th className="px-6 py-3 font-medium text-slate-400">Vendedor</th>
                <th className="px-6 py-3 font-medium text-slate-400">Vencimiento</th>
                <th className="px-6 py-3 font-medium text-slate-400 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {upcomingInvoices.slice(0, 8).map((inv, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-200">
                    {/* @ts-ignore */}
                    {inv.clients?.name || "Desconocido"}
                  </td>
                  <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                    {inv.invoice_number}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {/* @ts-ignore */}
                    {inv.vendors?.name || "-"}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className={inv.daysDiff < 0 ? "text-rose-400 font-medium" : "text-amber-400 font-medium"}>
                        {format(inv.dueDate, "dd MMM yyyy", { locale: es })}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {inv.daysDiff < 0 ? `hace ${Math.abs(inv.daysDiff)} días` : `en ${inv.daysDiff} días`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 font-medium text-right text-emerald-400">
                    ${Number(inv.balance_amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {upcomingInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No hay facturas en el radar de cobranza cercano.
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
