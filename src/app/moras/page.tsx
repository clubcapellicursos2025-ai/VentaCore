import { createClient } from "@/utils/supabase/server";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { MorasTable, MoraRow } from "@/components/features/moras/MorasTable";

export default async function MorasImportantesPage() {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      client_id,
      original_amount,
      balance_amount, 
      due_date,
      invoice_number,
      origin_brand,
      clients(id, name, cuit_cuil, dni, locality),
      vendors(name)
    `)
    .gt('balance_amount', 0); // Only get invoices with debt

  let highRiskDebt = 0;
  let totalMora = 0;
  let moraInvoices: any[] = [];
  const today = new Date();

  if (invoices) {
    invoices.forEach((inv) => {
      const balance = Number(inv.balance_amount || 0);
      const dueDate = inv.due_date ? new Date(inv.due_date) : today;
      const daysDiff = differenceInDays(today, dueDate); // positive = days late

      if (daysDiff > 0) {
        totalMora += balance;
        moraInvoices.push({ ...inv, daysLate: daysDiff, balance });
        
        if (daysDiff > 30) {
          highRiskDebt += balance;
        }
      }
    });
  }

  // Sort by highest balance then days late
  moraInvoices.sort((a, b) => b.balance - a.balance || b.daysLate - a.daysLate);

  // Top 10 worst debtors
  const topMora = moraInvoices.slice(0, 50);

  const formattedMora: MoraRow[] = topMora.map((inv: any) => ({
    id: inv.id,
    clientId: inv.client_id || inv.clients?.id || "",
    clientName: inv.clients?.name || "Desconocido",
    locality: inv.clients?.locality || "-",
    invoice_number: inv.invoice_number || "",
    origin_brand: inv.origin_brand || "N/A",
    vendorName: inv.vendors?.name || "Sin Vendedor",
    daysLate: inv.daysLate,
    balance: inv.balance
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-rose-500">Moras Importantes</h1>
          <p className="text-slate-400 mt-1">Análisis ejecutivo de riesgo, mayores deudores y moras antiguas.</p>
        </div>
      </div>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <AlertCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-rose-900/20" />
          <h3 className="text-sm font-medium text-rose-400">Total en Mora</h3>
          <p className="text-3xl font-bold mt-2 text-white">
            ${totalMora.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <AlertTriangle className="absolute -right-4 -bottom-4 w-32 h-32 text-amber-900/20" />
          <h3 className="text-sm font-medium text-amber-400">Deuda Crítica (&gt; 30 días)</h3>
          <p className="text-3xl font-bold mt-2 text-white">
            ${highRiskDebt.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-800" />
          <h3 className="text-sm font-medium text-slate-400">Facturas Vencidas</h3>
          <p className="text-3xl font-bold mt-2 text-white">{moraInvoices.length}</p>
        </div>
      </div>

      <MorasTable initialInvoices={formattedMora} />
    </div>
  );
}
