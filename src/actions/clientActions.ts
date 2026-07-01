"use server";

import { createClient } from "@/utils/supabase/server";

export interface PaginatedClientsResult {
  clients: any[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export async function getClientsPaginatedAction({
  page = 1,
  limit = 50,
  query = "",
  vendorId = "",
  status = ""
}: {
  page?: number;
  limit?: number;
  query?: string;
  vendorId?: string;
  status?: string;
}): Promise<PaginatedClientsResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("clients").select("*", { count: "exact", head: true });
  let dataQuery = supabase
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
        vendor_id,
        vendors (
          name
        )
      )
    `)
    .order("name", { ascending: true });

  if (query) {
    const filterStr = `dni.ilike.%${query}%,cuit_cuil.ilike.%${query}%,identifier.ilike.%${query}%,client_code.ilike.%${query}%,name.ilike.%${query}%`;
    countQuery = countQuery.or(filterStr);
    dataQuery = dataQuery.or(filterStr);
  }

  if (status && status !== "ALL") {
    countQuery = countQuery.eq("status", status.toLowerCase());
    dataQuery = dataQuery.eq("status", status.toLowerCase());
  }

  const { count, error: countErr } = await countQuery;
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: clients, error: dataErr } = await dataQuery.range(from, to);

  if (dataErr) {
    throw new Error(`Error al obtener clientes paginados: ${dataErr.message}`);
  }

  const today = new Date();

  const formatted = (clients || []).map((client: any) => {
    let totalDebt = 0;
    let overdueDebt = 0;
    let vendorName = "";

    const invoices = Array.isArray(client.invoices) ? client.invoices : [];
    invoices.forEach((inv: any) => {
      const bal = Number(inv.balance_amount || 0);
      totalDebt += bal;

      let dueDate = today;
      if (inv.due_date) {
        const d = new Date(String(inv.due_date).includes("T") ? inv.due_date : `${inv.due_date}T12:00:00Z`);
        if (!isNaN(d.getTime())) dueDate = d;
        else {
          const d2 = new Date(inv.due_date);
          if (!isNaN(d2.getTime())) dueDate = d2;
        }
      }

      const overdueTime = today.getTime() - dueDate.getTime();
      const overdueDays = Math.floor(overdueTime / (1000 * 3600 * 24));
      if (overdueDays > 0 && bal > 0) {
        overdueDebt += bal;
      }

      if (!vendorName && inv.vendors?.name) {
        vendorName = inv.vendors.name;
      }
    });

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
      vendorName: vendorName || "General"
    };
  });

  return {
    clients: formatted,
    totalCount,
    currentPage: page,
    totalPages
  };
}
