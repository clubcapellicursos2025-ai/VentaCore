import { createClient } from "@/utils/supabase/server";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Receipt, AlertTriangle, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { VendorCharts } from "./VendorCharts";

export async function VendorView({ vendorId }: { vendorId: string }) {
  const supabase = await createClient();

  const { data: vendor, error } = await supabase
    .from("vendors")
    .select(`
      id,
      name,
      vendor_code,
      invoices (
        id,
        invoice_number,
        issue_date,
        due_date,
        balance_amount,
        clients (
          id,
          name,
          client_code
        ),
        brands (
          name
        )
      )
    `)
    .eq("id", vendorId)
    .single();

  if (error || !vendor) {
    return (
      <div className="p-6 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
        <h2 className="text-lg font-bold text-white mb-2">Vendedor no encontrado</h2>
        <p>No se pudo cargar la información de este vendedor.</p>
      </div>
    );
  }

  const today = new Date();
  let total_debt = 0;
  let overdue_debt = 0;
  
  // Agrupar deuda por cliente para los gráficos
  const debtByClient: Record<string, number> = {};

  const processedInvoices = vendor.invoices.map((inv: any) => {
    const balance = Number(inv.balance_amount);
    const issueDate = new Date(inv.issue_date + "T12:00:00Z");
    const dueDate = new Date(inv.due_date + "T12:00:00Z");
    const overdueDays = differenceInDays(today, dueDate);
    const ageDays = differenceInDays(today, issueDate);
    const clientName = inv.clients?.name || "Desconocido";
    
    total_debt += balance;
    if (overdueDays > 0) {
      overdue_debt += balance;
    }

    if (!debtByClient[clientName]) {
      debtByClient[clientName] = 0;
    }
    debtByClient[clientName] += balance;

    return {
      ...inv,
      balance,
      dueDate,
      issueDate,
      ageDays,
      overdueDays: overdueDays > 0 ? overdueDays : 0,
      daysToDue: overdueDays < 0 ? Math.abs(overdueDays) : 0,
      clientName,
      clientId: inv.clients?.id,
      clientCode: inv.clients?.client_code,
      brandName: inv.brands?.name || "-"
    };
  }).sort((a, b) => {
    // Ordenar primero por días de atraso (mayor atraso primero)
    if (b.overdueDays !== a.overdueDays) {
      return b.overdueDays - a.overdueDays;
    }
    // Luego por monto (mayor monto primero)
    return b.balance - a.balance;
  });

  const chartData = Object.entries(debtByClient).map(([name, value]) => ({ name, value }));
  const uniqueClientsCount = Object.keys(debtByClient).length;

  const formatCurrency = (num: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{vendor.name}</h1>
          <p className="text-slate-400 mt-1 font-mono">Código ERP: {vendor.vendor_code}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="w-16 h-16" /></div>
           <p className="text-slate-400 text-sm font-medium mb-1">Deuda Total Cartera</p>
           <p className="text-2xl font-bold text-white">{formatCurrency(total_debt)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5"><AlertTriangle className="w-16 h-16" /></div>
           <p className="text-slate-400 text-sm font-medium mb-1">Deuda Vencida (Urgente)</p>
           <p className={`text-2xl font-bold ${overdue_debt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
             {formatCurrency(overdue_debt)}
           </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Clientes Asignados</p>
           <div className="flex items-center gap-2">
             <Users className="w-5 h-5 text-emerald-500" />
             <p className="text-2xl font-bold text-white">{uniqueClientsCount}</p>
           </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Facturas Pendientes</p>
           <div className="flex items-center gap-2">
             <Receipt className="w-5 h-5 text-emerald-500" />
             <p className="text-2xl font-bold text-white">{processedInvoices.length}</p>
           </div>
        </div>
      </div>

      {/* Gráficos */}
      <VendorCharts data={chartData} />

      {/* Action Grid (Prioridad de Cobranza) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h3 className="font-medium flex items-center gap-2 text-white">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Prioridad de Cobranza
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Lista ordenada automáticamente priorizando facturas con mayor atraso y mayor monto.
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-400">Cliente</th>
                <th className="px-4 py-3 font-medium text-slate-400">Comprobante</th>
                <th className="px-4 py-3 font-medium text-slate-400">Marca</th>
                <th className="px-4 py-3 font-medium text-slate-400">Vencimiento</th>
                <th className="px-4 py-3 font-medium text-slate-400">Estado</th>
                <th className="px-4 py-3 font-medium text-slate-400 text-right">Saldo a Cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {processedInvoices.map((inv: any) => (
                <tr key={inv.id} className={`hover:bg-slate-800/50 transition-colors ${inv.overdueDays > 15 ? 'bg-red-500/5' : ''}`}>
                  <td className="px-4 py-3">
                    <Link href={`/clients/${inv.clientId}`} className="font-medium text-slate-200 hover:text-emerald-400 transition-colors">
                      {inv.clientName}
                    </Link>
                    <div className="text-xs text-slate-500 font-mono mt-1">Cód: {inv.clientCode}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300 text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-400">{inv.brandName}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {format(inv.dueDate, "dd MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {inv.overdueDays > 0 ? (
                        <span className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <Clock className="w-3 h-3" />
                          {inv.overdueDays} d. mora
                        </span>
                      ) : (
                        <span className="inline-flex w-fit items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          {inv.daysToDue > 0 ? `A vencer en ${inv.daysToDue} d.` : `Vence hoy`}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {inv.ageDays} d. desde emisión
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${inv.overdueDays > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {formatCurrency(inv.balance)}
                  </td>
                </tr>
              ))}
              
              {processedInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Este vendedor no tiene facturas pendientes de cobro asignadas.
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
