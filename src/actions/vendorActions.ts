"use server";

import { createClient } from "@/utils/supabase/server";
import { differenceInDays } from "date-fns";
import { revalidatePath } from "next/cache";

export interface VendorData {
  id: string;
  name: string;
  vendor_code: string;
  status: string;
  brand_codes?: Record<string, string[]>;
  totalDebt: number;
  overdueDebt: number;
  uniqueClients: number;
  overduePercentage: number;
}

import { OFFICIAL_VENDORS, getOfficialVendorMatch } from "@/constants/officialVendors";

async function getCompanyId(supabase: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const { data: anyComp } = await supabase.from('companies').select('id').limit(1);
    if (anyComp && anyComp.length > 0) return anyComp[0].id;
    throw new Error("No autenticado y sin compañía.");
  }
  const { data: comp } = await supabase.from('companies').select('id').limit(1);
  if (!comp || comp.length === 0) throw new Error("Compañía no encontrada");
  return comp[0].id;
}

export async function getVendorsList(): Promise<VendorData[]> {
  const supabase = await createClient();
  const today = new Date();

  let { data: rawVendors, error }: { data: any[] | null; error: any } = await supabase
    .from("vendors")
    .select(`
      id,
      name,
      vendor_code,
      status,
      brand_codes,
      invoices (
        balance_amount,
        client_id,
        due_date
      )
    `);

  if (error) {
    console.warn("Fallo en consulta de vendedores con brand_codes (intentando fallback sin brand_codes):", error.message || error.details || JSON.stringify(error));
    const fallbackRes = await supabase
      .from("vendors")
      .select(`
        id,
        name,
        vendor_code,
        status,
        invoices (
          balance_amount,
          client_id,
          due_date
        )
      `);
    if (!fallbackRes.error) {
      rawVendors = fallbackRes.data as any[];
      error = null;
    } else {
      console.error("Error fetching vendors:", fallbackRes.error.message || fallbackRes.error.details || JSON.stringify(fallbackRes.error));
      return [];
    }
  }

  const safeParseDate = (dateStr: any, fallback: Date = today): Date => {
    if (!dateStr) return fallback;
    try {
      if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;
      const str = String(dateStr).trim();
      let d = new Date(str.includes('T') ? str : `${str}T12:00:00Z`);
      if (!isNaN(d.getTime())) return d;
      d = new Date(str);
      if (!isNaN(d.getTime())) return d;
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 3) {
          d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00Z`);
          if (!isNaN(d.getTime())) return d;
        }
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const vendors = (rawVendors || []).map((vendor: any) => {
    let totalDebt = 0;
    let overdueDebt = 0;
    const clientIds = new Set<string>();

    if (vendor.invoices && Array.isArray(vendor.invoices)) {
      vendor.invoices.forEach((inv: any) => {
        const balance = Number(inv.balance_amount || 0);
        totalDebt += balance;
        if (inv.client_id) clientIds.add(inv.client_id);

        const dueDate = safeParseDate(inv.due_date, today);
        if (differenceInDays(today, dueDate) > 0) {
          overdueDebt += balance;
        }
      });
    }

    const uniqueClients = clientIds.size;
    const overduePercentage = totalDebt > 0 ? (overdueDebt / totalDebt) * 100 : 0;

    const match = getOfficialVendorMatch(vendor.vendor_code, vendor.name);
    const finalName = match ? match.name : (vendor.name || "Sin Nombre");
    const finalCode = match ? match.code : (vendor.vendor_code || "-");
    const finalStatus = match ? match.status : (vendor.status || "active");
    const finalBrandCodes = match ? match.brand_codes : (vendor.brand_codes || {});

    return {
      id: vendor.id,
      name: finalName,
      vendor_code: finalCode,
      status: finalStatus,
      brand_codes: finalBrandCodes,
      totalDebt,
      overdueDebt,
      uniqueClients,
      overduePercentage
    };
  });

  // Si hay vendedores genéricos en DB, normalizar en background
  if ((rawVendors || []).some((v: any) => v.name && (v.name.toLowerCase().startsWith("vendedor ") || !isNaN(Number(v.name))))) {
    syncOfficialVendorsAction().catch(() => {});
  }

  const mergedVendorsMap = new Map<string, VendorData>();

  OFFICIAL_VENDORS.forEach((off) => {
    mergedVendorsMap.set(off.code.toUpperCase(), {
      id: `official-${off.code}`,
      name: off.name,
      vendor_code: off.code,
      status: off.status,
      brand_codes: off.brand_codes,
      totalDebt: 0,
      overdueDebt: 0,
      uniqueClients: 0,
      overduePercentage: 0
    });
  });

  vendors.forEach((v) => {
    const codeKey = String(v.vendor_code || "").trim().toUpperCase();
    const existing = mergedVendorsMap.get(codeKey);
    if (existing) {
      if (!existing.id.startsWith("official-") || !v.id.startsWith("official-")) {
        existing.id = !v.id.startsWith("official-") ? v.id : existing.id;
      }
      existing.totalDebt += v.totalDebt;
      existing.overdueDebt += v.overdueDebt;
      existing.uniqueClients = Math.max(existing.uniqueClients, v.uniqueClients);
      existing.overduePercentage = existing.totalDebt > 0 ? (existing.overdueDebt / existing.totalDebt) * 100 : 0;
    } else {
      mergedVendorsMap.set(codeKey || v.id, v);
    }
  });

  const finalVendorsList = Array.from(mergedVendorsMap.values());

  finalVendorsList.sort((a, b) => {
    const numA = parseInt(a.vendor_code, 10);
    const numB = parseInt(b.vendor_code, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.name.localeCompare(b.name);
  });

  return finalVendorsList;
}

export async function saveVendorAction(data: {
  id?: string;
  name: string;
  vendor_code: string;
  status: string;
  brand_codes?: Record<string, string[]>;
}) {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);

  const payload = {
    company_id: companyId,
    name: data.name.trim(),
    vendor_code: data.vendor_code.trim().toUpperCase(),
    status: data.status || "active",
    brand_codes: data.brand_codes || {}
  };

  if (data.id) {
    const { error } = await supabase
      .from("vendors")
      .update(payload)
      .eq("id", data.id)
      .eq("company_id", companyId);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("vendors")
      .insert(payload);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/vendors");
  return { success: true };
}

export async function deleteVendorAction(id: string) {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);

  // Intentamos borrar. Si tiene facturas vinculadas con SET NULL se mantendrán o podemos cambiar status a inactive
  const { error } = await supabase
    .from("vendors")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    // Si falla por integridad o clave foránea, lo inactivamos
    await supabase
      .from("vendors")
      .update({ status: "inactive" })
      .eq("id", id)
      .eq("company_id", companyId);
  }

  revalidatePath("/vendors");
  return { success: true };
}

export async function syncOfficialVendorsAction() {
  const supabase = await createClient();
  const companyId = await getCompanyId(supabase);

  const { data: existingVendors } = await supabase
    .from("vendors")
    .select("id, vendor_code, name")
    .eq("company_id", companyId);

  const existingMapByCode = new Map<string, string>();
  if (existingVendors) {
    for (const v of existingVendors) {
      if (v.vendor_code) existingMapByCode.set(String(v.vendor_code).toUpperCase(), v.id);
      const match = getOfficialVendorMatch(v.vendor_code, v.name);
      if (match && (v.name !== match.name || v.vendor_code !== match.code)) {
        const payload = {
          name: match.name,
          vendor_code: match.code,
          status: match.status,
          brand_codes: match.brand_codes
        };
        const { error: updErr } = await supabase.from("vendors").update(payload).eq("id", v.id);
        if (updErr && (updErr.message.includes("brand_codes") || updErr.code === "PGRST204")) {
          const { brand_codes, ...fallbackPayload } = payload;
          await supabase.from("vendors").update(fallbackPayload).eq("id", v.id);
        }
      }
    }
  }

  for (const item of OFFICIAL_VENDORS) {
    const code = item.code.toUpperCase();
    const existingId = existingMapByCode.get(code);

    const payload = {
      company_id: companyId,
      name: item.name,
      vendor_code: code,
      status: item.status,
      brand_codes: item.brand_codes
    };

    if (existingId) {
      const { error: updErr } = await supabase
        .from("vendors")
        .update(payload)
        .eq("id", existingId);
      if (updErr && (updErr.message.includes("brand_codes") || updErr.code === "PGRST204")) {
        const { brand_codes, ...fallbackPayload } = payload;
        await supabase.from("vendors").update(fallbackPayload).eq("id", existingId);
      }
    } else {
      const { error: insErr } = await supabase
        .from("vendors")
        .insert(payload);
      if (insErr && (insErr.message.includes("brand_codes") || insErr.code === "PGRST204")) {
        const { brand_codes, ...fallbackPayload } = payload;
        await supabase.from("vendors").insert(fallbackPayload);
      }
    }
  }

  revalidatePath("/vendors");
  return { success: true, message: "21 vendedores oficiales sincronizados correctamente según diagrama." };
}
