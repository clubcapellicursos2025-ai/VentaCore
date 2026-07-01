import { createClient } from "@/utils/supabase/server";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Users, Receipt, AlertTriangle, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { VendorCharts } from "./VendorCharts";
import { VendorInvoicesTable } from "./VendorInvoicesTable";

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
        origin_brand,
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
      brandName: inv.origin_brand || inv.brands?.name || "-"
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
      <VendorInvoicesTable invoices={processedInvoices} />
    </div>
  );
}
