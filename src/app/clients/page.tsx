import { createClient } from "@/utils/supabase/server";
import { ClientSearchInput } from "@/components/features/search/ClientSearchInput";
import { ClientsTable } from "@/components/features/clients/ClientsTable";
import { differenceInDays } from "date-fns";

export default async function ClientsPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.q || "";
  
  const supabase = await createClient();

  // Obtener clientes con todos sus datos y facturas para calcular métricas
  let dbQuery = supabase
    .from("clients")
    .select(`
      id,
      client_code,
      name,
      identifier,
      dni,
      cuit_cuil,
      locality,
      address,
      status,
      origin_codes,
      invoices (
        balance_amount,
        due_date,
        vendors (
          name
        )
      )
    `)
    .order("name");

  if (query) {
    dbQuery = dbQuery.or(`dni.ilike.%${query}%,cuit_cuil.ilike.%${query}%,identifier.ilike.%${query}%,client_code.ilike.%${query}%,name.ilike.%${query}%`);
  }

  const { data: clients } = await dbQuery;
  const today = new Date();

  const formattedClients = (clients || []).map((client: any) => {
    let totalDebt = 0;
    let overdueDebt = 0;
    let vendorName = "";

    const invoices = Array.isArray(client.invoices) ? client.invoices : [];
    invoices.forEach((inv: any) => {
      const bal = Number(inv.balance_amount || 0);
      totalDebt += bal;
      
      let dueDate = today;
      if (inv.due_date) {
        const d = new Date(String(inv.due_date).includes('T') ? inv.due_date : `${inv.due_date}T12:00:00Z`);
        if (!isNaN(d.getTime())) dueDate = d;
        else {
          const d2 = new Date(inv.due_date);
          if (!isNaN(d2.getTime())) dueDate = d2;
        }
      }
      const overdueDays = differenceInDays(today, dueDate);
      if (overdueDays > 0 && bal > 0) {
        overdueDebt += bal;
      }

      if (!vendorName && inv.vendors?.name) {
        vendorName = inv.vendors.name;
      }
    });

    // Determine identifier string
    let idStr = client.identifier || "";
    if (!idStr && (client.dni || client.cuit_cuil)) {
      if (client.dni && client.cuit_cuil) idStr = `${client.dni} / ${client.cuit_cuil}`;
      else idStr = client.dni || client.cuit_cuil || "";
    }

    return {
      id: client.id,
      client_code: client.client_code || "",
      name: client.name || "Sin nombre",
      identifier: idStr,
      locality: client.locality || "",
      address: client.address || "",
      status: client.status || "active",
      invoicesCount: invoices.length,
      totalDebt,
      overdueDebt,
      vendorName: vendorName || "General",
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Gestión Oficial de Clientes
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Historial consolidado, saldos pendientes y estado crediticio de la cartera en calle.
          </p>
        </div>
        <div className="flex items-center">
          <ClientSearchInput />
        </div>
      </div>

      <ClientsTable clients={formattedClients} />
    </div>
  );
}
