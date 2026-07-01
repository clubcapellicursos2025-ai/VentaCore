"use client";

import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpDown, ArrowUp, ArrowDown, Clock, CheckCircle2, AlertTriangle, Receipt } from "lucide-react";

interface VendorInvoiceRow {
  id: string;
  clientId?: string;
  clientName: string;
  clientCode?: string;
  invoice_number: string;
  brandName: string;
  dueDate: Date;
  overdueDays: number;
  daysToDue: number;
  ageDays: number;
  balance: number;
}

export function VendorInvoicesTable({ invoices }: { invoices: VendorInvoiceRow[] }) {
  const [sortField, setSortField] = useState<keyof VendorInvoiceRow>("overdueDays");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // Default: highest mora first

  const handleSort = (field: keyof VendorInvoiceRow) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA instanceof Date && valB instanceof Date) {
      return sortDir === "asc" ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return sortDir === "asc" ? valA - valB : valB - valA;
    }

    return 0;
  });

  const renderSortIcon = (field: keyof VendorInvoiceRow) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />;
  };

  const formatCurrency = (num: number) => 
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(num);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mt-6">
      <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Receipt className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-white text-base">Prioridad de Cobranza por Comprobante</h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {sortedInvoices.length} pendientes
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Ordena por mora, saldo o vencimiento para planificar el recorrido
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80 border-b border-slate-800/80 select-none">
            <tr>
              <th 
                onClick={() => handleSort("clientName")}
                className="px-5 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Cliente</span>
                  {renderSortIcon("clientName")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("invoice_number")}
                className="px-5 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Comprobante</span>
                  {renderSortIcon("invoice_number")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("brandName")}
                className="px-5 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Marca</span>
                  {renderSortIcon("brandName")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("dueDate")}
                className="px-5 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Vencimiento</span>
                  {renderSortIcon("dueDate")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("overdueDays")}
                className="px-5 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Estado de Deuda</span>
                  {renderSortIcon("overdueDays")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("balance")}
                className="px-5 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Saldo a Cobrar</span>
                  {renderSortIcon("balance")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedInvoices.map((inv) => (
              <tr 
                key={inv.id} 
                className={`hover:bg-slate-800/40 transition-colors ${inv.overdueDays > 15 ? "bg-rose-500/5" : ""}`}
              >
                <td className="px-5 py-3.5">
                  {inv.clientId ? (
                    <Link href={`/clients/${inv.clientId}`} className="font-bold text-slate-200 hover:text-cyan-400 transition-colors underline decoration-slate-700 underline-offset-4">
                      {inv.clientName}
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-200">{inv.clientName}</span>
                  )}
                  {inv.clientCode && (
                    <div className="text-xs text-cyan-400/80 font-mono mt-0.5">Cód: {inv.clientCode}</div>
                  )}
                </td>
                <td className="px-5 py-3.5 font-mono text-slate-300 text-xs">
                  {inv.invoice_number}
                </td>
                <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50">
                    {inv.brandName}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-300 font-medium text-xs">
                  {format(new Date(inv.dueDate), "dd MMM yyyy", { locale: es })}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex flex-col gap-1">
                    {inv.overdueDays > 0 ? (
                      <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <Clock className="w-3 h-3 animate-pulse" />
                        {inv.overdueDays} días de mora
                      </span>
                    ) : (
                      <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {inv.daysToDue > 0 ? `Vence en ${inv.daysToDue} d.` : `Vence hoy`}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500">
                      Emitida hace {inv.ageDays} días
                    </span>
                  </div>
                </td>
                <td className={`px-5 py-3.5 text-right font-mono font-bold text-base ${inv.overdueDays > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {formatCurrency(inv.balance)}
                </td>
              </tr>
            ))}
            
            {sortedInvoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  Este vendedor no tiene facturas pendientes de cobro asignadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
