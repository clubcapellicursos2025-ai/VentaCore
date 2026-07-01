"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Receipt, Store, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ClientOriginGroups({ invoices }: { invoices: any[] }) {
  // Group invoices by origin
  const originsMap = new Map<string, any[]>();
  
  invoices.forEach(inv => {
     const origin = inv.brandName || "Sin Origen";
     const current = originsMap.get(origin) || [];
     current.push(inv);
     originsMap.set(origin, current);
  });

  const [openOrigins, setOpenOrigins] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    originsMap.forEach((_, key) => { initial[key] = true; }); // Open by default
    return initial;
  });

  const toggleOrigin = (origin: string) => {
    setOpenOrigins(prev => ({ ...prev, [origin]: !prev[origin] }));
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);

  const safeFormatDate = (dateVal: any, rawStr?: string): string => {
    if (!dateVal && !rawStr) return "-";
    try {
      let d = dateVal instanceof Date ? dateVal : new Date(dateVal || (rawStr ? (rawStr.includes('T') ? rawStr : `${rawStr}T12:00:00Z`) : ""));
      if (isNaN(d.getTime()) && rawStr) {
        d = new Date(rawStr);
      }
      if (isNaN(d.getTime())) return String(rawStr || "-");
      return format(d, "dd MMM yyyy", { locale: es });
    } catch {
      return String(rawStr || "-");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Store className="w-5 h-5 text-blue-400" />
        Historial Agrupado por Origen
      </h3>

      {Array.from(originsMap.entries()).map(([origin, invs]) => {
        const isOpen = openOrigins[origin];
        const originDebt = invs.reduce((sum, inv) => sum + inv.balance, 0);

        return (
          <div key={origin} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div 
              onClick={() => toggleOrigin(origin)}
              className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 cursor-pointer hover:bg-slate-950 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                <div>
                  <h4 className="font-semibold text-white text-base">{origin}</h4>
                  <p className="text-xs text-slate-400">{invs.length} comprobantes registrados</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Deuda Origen:</span>
                <span className={`font-bold ${originDebt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatCurrency(originDebt)}
                </span>
              </div>
            </div>

            {isOpen && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-950/40">
                    <tr>
                      <th className="px-6 py-3 font-medium text-slate-400">Vendedor</th>
                      <th className="px-6 py-3 font-medium text-slate-400">Comprobante</th>
                      <th className="px-6 py-3 font-medium text-slate-400">Tipo</th>
                      <th className="px-6 py-3 font-medium text-slate-400">Emisión</th>
                      <th className="px-6 py-3 font-medium text-slate-400">Vencimiento</th>
                      <th className="px-6 py-3 font-medium text-slate-400 text-right">Original</th>
                      <th className="px-6 py-3 font-medium text-slate-400 text-right">Saldo</th>
                      <th className="px-6 py-3 font-medium text-slate-400">Estado / Obs.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {invs.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-300">
                          {inv.vendorName}
                        </td>
                        <td className="px-6 py-3 font-mono text-slate-300 text-xs">
                          {inv.invoice_number}
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs">
                          {inv.invoice_type || 'Factura'}
                        </td>
                        <td className="px-6 py-3 text-slate-400">
                          {safeFormatDate(inv.issueDate, inv.issue_date)}
                        </td>
                        <td className="px-6 py-3 text-slate-400">
                          {safeFormatDate(inv.dueDate, inv.due_date)}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-slate-400">
                          {formatCurrency(inv.original)}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-emerald-400">
                          {formatCurrency(inv.balance)}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex flex-col gap-1">
                            {inv.overdueDays > 0 ? (
                              <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                <Clock className="w-3 h-3" />
                                {inv.overdueDays} d. mora
                              </span>
                            ) : (
                              <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Al día
                              </span>
                            )}
                            {inv.observations && inv.observations.trim() !== '' && (
                              <span className="text-xs text-slate-500 font-mono truncate max-w-[150px]" title={inv.observations}>
                                Obs: {inv.observations}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {originsMap.size === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
          Este cliente no tiene comprobantes en el historial de cuentas corrientes.
        </div>
      )}
    </div>
  );
}
