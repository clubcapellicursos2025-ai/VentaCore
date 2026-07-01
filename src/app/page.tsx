import { createClient } from "@/utils/supabase/server";
import { ClientCharts } from "@/components/features/dashboard/ClientCharts";
import { RadarTable } from "@/components/features/dashboard/RadarTable";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Obtener total de clientes y datos para métricas
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name');

  const totalClients = clients?.length || 0;

  // Obtener toda la deuda y facturas
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      original_amount,
      balance_amount, 
      due_date,
      invoice_number,
      client_id,
      vendor_id,
      origin_brand,
      clients(name),
      vendors(name, vendor_code)
    `);

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, vendor_code');

  const totalVendors = vendors?.length || 0;

  let globalDebt = 0;
  let totalOriginal = 0;
  let totalPaid = 0;
  let totalMoraDays = 0;
  let invoicesWithMoraCount = 0;
  
  const clientDebtMap = new Map<string, { name: string; debt: number; hasMora: boolean }>();
  const vendorDebtMap = new Map<string, number>();
  const brandDebtMap = new Map<string, number>();
  const clientVendorMap = new Map<string, string>(); // clientId -> vendorCode
  
  let maxPayment = 0;
  let upcomingInvoices: any[] = [];
  const today = new Date();

  if (invoices) {
    invoices.forEach((inv) => {
      const balance = Number(inv.balance_amount || 0);
      const original = Number(inv.original_amount || 0);
      const paid = original - balance > 0 ? original - balance : 0;

      globalDebt += balance;
      totalOriginal += original;
      totalPaid += paid;

      if (paid > maxPayment) {
        maxPayment = paid;
      }

      const dueDate = inv.due_date ? new Date(inv.due_date) : today;
      const daysDiff = differenceInDays(today, dueDate); // positive if past due date (mora)
      
      let isMora = false;
      if (daysDiff > 0 && balance > 0) {
        isMora = true;
        totalMoraDays += daysDiff;
        invoicesWithMoraCount++;
      }

      // Próximos a vencer (o vencidos recientemente, e.g. entre -15 y +15 días)
      const diffFromToday = differenceInDays(dueDate, today);
      if (diffFromToday >= -15 && diffFromToday <= 15 && balance > 0) {
        upcomingInvoices.push({ ...inv, daysDiff: diffFromToday, dueDate });
      }

      // Agrupar por Cliente
      if (inv.client_id) {
        // @ts-ignore
        const clientName = inv.clients?.name || "Desconocido";
        const current = clientDebtMap.get(inv.client_id) || { name: clientName, debt: 0, hasMora: false };
        current.debt += balance;
        if (isMora) current.hasMora = true;
        clientDebtMap.set(inv.client_id, current);

        // Track vendor for client
        // @ts-ignore
        const vCode = inv.vendors?.vendor_code || "SIN_VENDEDOR";
        clientVendorMap.set(inv.client_id, vCode);
      }

      // Agrupar por Vendedor
      // @ts-ignore
      const vendorName = inv.vendors?.name || "Sin Vendedor";
      vendorDebtMap.set(vendorName, (vendorDebtMap.get(vendorName) || 0) + balance);

      // Agrupar por Marca / Origen
      const brandName = inv.origin_brand || "Otro";
      brandDebtMap.set(brandName, (brandDebtMap.get(brandName) || 0) + balance);
    });
  }

  // Clientes con Mora y sin Mora
  let clientsWithMora = 0;
  let maxDebtor = { name: "Ninguno", debt: 0 };
  
  clientDebtMap.forEach((val) => {
    if (val.hasMora) clientsWithMora++;
    if (val.debt > maxDebtor.debt) {
      maxDebtor = val;
    }
  });

  const clientsWithoutMora = totalClients - clientsWithMora;
  const avgMoraDays = invoicesWithMoraCount > 0 ? Math.round(totalMoraDays / invoicesWithMoraCount) : 0;

  // Clientes sin vendedor
  let clientsWithoutVendor = 0;
  clients?.forEach(c => {
    const vCode = clientVendorMap.get(c.id);
    if (!vCode || vCode === 'SIN_VENDEDOR' || vCode === 'unassigned') {
      clientsWithoutVendor++;
    }
  });

  // Ordenar próximos a vencer por fecha
  upcomingInvoices.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Preparar datos para Recharts
  const vendorData = Array.from(vendorDebtMap.entries())
    .map(([name, debt]) => ({ name, debt }))
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 10);

  const brandData = Array.from(brandDebtMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-slate-400 mt-1">Inteligencia comercial cruzada (L'Oréal, Key Full y Wella).</p>
        </div>
      </div>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Total Clientes</h3>
          <p className="text-2xl font-bold mt-1 text-white">{totalClients}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Total Facturas</h3>
          <p className="text-2xl font-bold mt-1 text-white">{invoices?.length || 0}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Deuda Global en Calle</h3>
          <p className="text-2xl font-bold mt-1 text-emerald-400">
            ${globalDebt.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Total Cobrado / Aplicado</h3>
          <p className="text-2xl font-bold mt-1 text-blue-400">
            ${totalPaid.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Clientes con Mora</h3>
          <p className="text-2xl font-bold mt-1 text-rose-500">{clientsWithMora}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Clientes sin Mora</h3>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{clientsWithoutMora}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Promedio de Mora</h3>
          <p className="text-2xl font-bold mt-1 text-amber-400">{avgMoraDays} días</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Mayor Deudor</h3>
          <p className="text-lg font-bold mt-1 text-white truncate" title={maxDebtor.name}>{maxDebtor.name}</p>
          <p className="text-xs text-rose-400">${maxDebtor.debt.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Mayor Pago Aplicado</h3>
          <p className="text-2xl font-bold mt-1 text-emerald-400">${maxPayment.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-medium text-slate-400">Vendedores Registrados</h3>
          <p className="text-2xl font-bold mt-1 text-white">{totalVendors}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg col-span-2">
          <h3 className="text-xs font-medium text-slate-400">Clientes sin Vendedor Asignado</h3>
          <p className="text-2xl font-bold mt-1 text-amber-500">{clientsWithoutVendor}</p>
        </div>
      </div>

      {/* Gráficos Recharts */}
      <ClientCharts vendorData={vendorData} brandData={brandData} />

      {/* Aging Report (Próximos a Vencer) */}
      <RadarTable invoices={upcomingInvoices} />
    </div>
  );
}
