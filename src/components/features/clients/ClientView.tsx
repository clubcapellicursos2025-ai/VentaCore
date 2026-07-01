import { AlertCircle, CheckCircle2, Clock, MapPin, Receipt, ShieldAlert, ChevronDown, ChevronRight, Store } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import React from "react";
import ClientOriginGroups from "./ClientOriginGroups";

export async function ClientView({ clientId }: { clientId: string }) {
  const supabase = await createClient();

  // Ejecutar consultas en paralelo sin JOINS de PostgREST para máxima velocidad y cero fallos por FK
  const [{ data: client, error }, { data: rawInvoices }, { data: vendorsData }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("invoices").select("*").eq("client_id", clientId),
    supabase.from("vendors").select("id, name")
  ]);

  if (error || !client) {
    return (
      <div className="p-6 text-center text-slate-400">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-lg font-bold text-white mb-2">Cliente no encontrado</h2>
        <p>No se pudo cargar la información de este cliente.</p>
        {error && <p className="text-xs text-rose-400 mt-2 font-mono">{error.message}</p>}
      </div>
    );
  }

  const vendorMap = new Map<string, string>();
  if (vendorsData) {
    vendorsData.forEach(v => vendorMap.set(v.id, v.name || "General"));
  }

  const clientInvoices = rawInvoices || [];

  const today = new Date();
  let total_debt = 0;
  let overdue_debt = 0;
  let max_overdue_days = 0;

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

  // Process invoices for metrics and grouping
  const processedInvoices = clientInvoices.map((inv: any) => {
    const balance = Number(inv.balance_amount);
    const original = Number(inv.original_amount);
    const payment = original - balance;
    const issueDate = safeParseDate(inv.issue_date, today);
    const dueDate = safeParseDate(inv.due_date, today);
    const overdueDays = differenceInDays(today, dueDate);
    const ageDays = differenceInDays(today, issueDate);
    
    total_debt += balance;
    if (overdueDays > 0 && balance > 0) {
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
      issueDate,
      ageDays,
      overdueDays: (overdueDays > 0 && balance > 0) ? overdueDays : 0,
      daysToDue: overdueDays < 0 ? Math.abs(overdueDays) : 0,
      brandName: inv.origin_brand || "Sin Origen",
      vendorName: vendorMap.get(inv.vendor_id) || "-"
    };
  }).sort((a, b) => {
    const timeA = a.dueDate instanceof Date && !isNaN(a.dueDate.getTime()) ? a.dueDate.getTime() : 0;
    const timeB = b.dueDate instanceof Date && !isNaN(b.dueDate.getTime()) ? b.dueDate.getTime() : 0;
    return timeB - timeA;
  }); // Sort by due date desc

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

  const formatCurrency = (num: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Risk Engine Banner */}
      <div className={`p-6 rounded-xl border flex flex-col md:flex-row items-start justify-between gap-4 ${getStatusColor(riskStatus)}`}>
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase border bg-black/20 tracking-wider">
              {riskStatus === 'red' ? 'Riesgo Crítico' : riskStatus === 'yellow' ? 'Riesgo Moderado' : 'Cuenta al Día'}
            </span>
          </div>
          <p className="opacity-80 flex flex-wrap items-center gap-2 text-sm mt-2">
            <span className="font-mono bg-black/20 px-2 py-0.5 rounded">ID: {client.client_code}</span> 
            <span>•</span>
            <span className="font-medium">CUIT:</span> {client.cuit_cuil || client.identifier || "-"} 
            <span>•</span>
            <span className="font-medium">DNI:</span> {client.dni || "-"} 
            <span>•</span>
            <MapPin className="w-4 h-4 inline" /> {client.address || "-"}, {client.locality || "-"}
          </p>
          {client.origin_codes && Array.isArray(client.origin_codes) && client.origin_codes.length > 1 && (
            <p className="opacity-70 text-xs mt-2 italic">
              * Cliente consolidado. Códigos originales: {client.origin_codes.join(", ")}
            </p>
          )}
        </div>
        
        {riskStatus === 'red' && (
          <div className="bg-red-500/20 p-3 rounded-lg flex items-center gap-3 w-full md:w-auto">
             <ShieldAlert className="w-8 h-8 shrink-0" />
             <div className="text-sm">
                <p className="font-bold">Cuenta Crítica</p>
                <p className="opacity-90">Atraso mayor a 30 días detectado.</p>
             </div>
          </div>
        )}
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Deuda Total Consolidada</p>
           <p className="text-3xl font-bold text-white">{formatCurrency(total_debt)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Deuda Vencida (Mora)</p>
           <p className={`text-3xl font-bold ${overdue_debt > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
             {formatCurrency(overdue_debt)}
           </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
           <p className="text-slate-400 text-sm font-medium mb-1">Peor Atraso</p>
           <p className="text-3xl font-bold text-white">
             {max_overdue_days} <span className="text-sm font-normal text-slate-500">días</span>
           </p>
        </div>
      </div>

      {/* Origin Groups Client Component */}
      <ClientOriginGroups invoices={processedInvoices} />
      
    </div>
  );
}
