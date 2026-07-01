import { createClient } from "@/utils/supabase/server";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      original_amount,
      balance_amount, 
      due_date,
      issue_date,
      invoice_number,
      invoice_type,
      origin_brand,
      is_active,
      clients(name, cuit_cuil, dni, locality, address),
      vendors(name, vendor_code)
    `)
    .order('due_date', { ascending: false });

  // Transform data for the client component
  const reportData = (invoices || []).map(inv => {
    // @ts-ignore
    const client = Array.isArray(inv.clients) ? inv.clients[0] || {} : inv.clients || {};
    // @ts-ignore
    const vendor = Array.isArray(inv.vendors) ? inv.vendors[0] || {} : inv.vendors || {};
    
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_type: inv.invoice_type,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      original_amount: inv.original_amount,
      balance_amount: inv.balance_amount,
      origin_brand: inv.origin_brand,
      is_active: inv.is_active,
      client_name: client.name || "Desconocido",
      client_cuit: client.cuit_cuil || "-",
      client_dni: client.dni || "-",
      client_locality: client.locality || "-",
      vendor_name: vendor.name || "Sin Vendedor",
      vendor_code: vendor.vendor_code || "-",
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Generador de Reportes</h1>
        <p className="text-slate-400 mt-1">Construye reportes dinámicos con múltiples filtros y expórtalos a Excel o CSV.</p>
      </div>
      
      <ReportsClient initialData={reportData} />
    </div>
  );
}
