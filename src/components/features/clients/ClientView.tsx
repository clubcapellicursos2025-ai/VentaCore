import { AlertCircle, CheckCircle2, Clock, MapPin, Receipt, ShieldAlert } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export async function ClientView({ clientId }: { clientId: string }) {
  const supabase = await createClient();

  // Fetch real client data
  const { data: client, error } = await supabase
    .from("clients")
    .select(`
      id,
      client_code,
      name,
      identifier,
      locality,
      address,
      status,
      invoices (
        id,
        invoice_number,
        issue_date,
        due_date,
        original_amount,
        balance_amount,
        observations,
        brands(name),
        vendors(name)
      )
    `)
    .eq("id", clientId)
    .single();

  if (error || !client) {
    return (
      <div className="p-6 text-center text-slate-400">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-bold text-white mb-2">Cliente no encontrado</h2>
        <p>No se pudo cargar la información de este cliente.</p>
      </div>
    );
  }

  const today = new Date();
  let total_debt = 0;
  let overdue_debt = 0;
  let max_overdue_days = 0;

  // Process invoices for metrics
  const processedInvoices = client.invoices.map((inv: any) => {
    const balance = Number(inv.balance_amount);
    const original = Number(inv.original_amount);
    const payment = original - balance;
    const dueDate = new Date(inv.due_date + "T12:00:00Z");
    const overdueDays = differenceInDays(today, dueDate);
    
    total_debt += balance;
    if (overdueDays > 0) {
      overdue_debt += balance;
      if (overdueDays > max_overdue_days) {
        max_overdue_days = overdueDays;
      }
    }

    return {
      ...inv,
      balance,
      original,
      payment,
      dueDate,
      overdueDays: overdueDays > 0 ? overdueDays : 0,
      brandName: inv.brands?.name || "-",
      vendorName: inv.vendors?.name || "-"
    };
  }).sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime()); // Sort by due date desc

  // Calculate Risk Status
  let riskStatus = "green";
  if (client.status === "blocked" || max_overdue_days > 30) {
    riskStatus = "red";
  } else if (max_overdue_days > 0) {
    riskStatus = "yellow";
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'green': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'yellow': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'red': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header & Risk Engine Banner */}
      <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-start justify-between gap-4 ${getStatusColor(riskStatus)}`}>
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase border bg-black/20 tracking-wider">
              {riskStatus === 'red' ? 'Riesgo Crítico' : riskStatus === 'yellow' ? 'Riesgo Moderado' : 'Cuenta al Día'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase border bg-black/20 tracking-wider opacity-70">
              Estado: {client.status}
            </span>
          </div>
          <p className="opacity-80 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono">Cód: {client.client_code}</span> • 
            <span>{client.identifier || "Sin CUIT"}</span> • 
            <MapPin className="w-3 h-3 inline" /> {client.address || "-"}, {client.locality || "-"}
          </p>
        </div>
        
        {riskStatus === 'red' && (
          <div className="bg-red-500/20 p-3 rounded-lg flex items-center gap-3 w-full md:w-auto">
             <ShieldAlert className="w-8 h-8 shrink-0" />
             <div className="text-sm">
                <p className="font-bold">Cuenta Crítica / Bloqueada</p>
                <p className="opacity-90">Atraso mayor a 30 días detectado.</p>
             </div>
          </div>
        )}
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Deuda Total</p>
           <p className="text-2xl font-bold text-white">{formatCurrency(total_debt)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Deuda Vencida</p>
           <p className={`text-2xl font-bold ${overdue_debt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
             {formatCurrency(overdue_debt)}
           </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Días Atraso (Máx)</p>
           <p className="text-2xl font-bold text-white">{max_overdue_days} <span className="text-sm font-normal text-slate-500">días</span></p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Límite Crédito</p>
           <div className="flex items-baseline gap-2 text-slate-500">
             <p className="text-2xl font-bold">Sin Asignar</p>
           </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <h3 className="font-medium flex items-center gap-2 text-white">
            <Receipt className="w-4 h-4 text-slate-400" />
            Comprobantes Pendientes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-400">Marca / Vendedor</th>
                <th className="px-4 py-3 font-medium text-slate-400">Comprobante</th>
                <th className="px-4 py-3 font-medium text-slate-400">Emisión</th>
                <th className="px-4 py-3 font-medium text-slate-400">Vencimiento</th>
                <th className="px-4 py-3 font-medium text-slate-400 text-right">Importe</th>
                <th className="px-4 py-3 font-medium text-slate-400 text-right">SuPago</th>
                <th className="px-4 py-3 font-medium text-slate-400 text-right">Saldo</th>
                <th className="px-4 py-3 font-medium text-slate-400">Estado / Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {processedInvoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{inv.brandName}</p>
                    <p className="text-xs text-slate-500">{inv.vendorName}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300 text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {format(new Date(inv.issue_date + "T12:00:00Z"), "dd MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {format(inv.dueDate, "dd MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-300">
                    {formatCurrency(inv.original)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-400">
                    {formatCurrency(inv.payment)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-400">
                    {formatCurrency(inv.balance)}
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
                          Al día
                        </span>
                      )}
                      {inv.observations && inv.observations.trim() !== '' && (
                        <span className="text-xs text-slate-500 font-mono">
                          Obs: {inv.observations}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {processedInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    El cliente no tiene deuda pendiente.
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
