"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpDown, ArrowUp, ArrowDown, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface RadarInvoice {
  id?: string;
  client_id?: string;
  clientName: string;
  invoice_number: string;
  vendorName: string;
  origin_brand: string;
  dueDate: Date;
  daysDiff: number;
  balance_amount: number;
}

export function RadarTable({ invoices }: { invoices: any[] }) {
  const [sortField, setSortField] = useState<keyof RadarInvoice>("dueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Transform raw invoices if needed
  const cleanInvoices: RadarInvoice[] = invoices.map((inv) => ({
    id: inv.id,
    client_id: inv.client_id,
    clientName: inv.clients?.name || "Desconocido",
    invoice_number: String(inv.invoice_number || ""),
    vendorName: inv.vendors?.name || "-",
    origin_brand: inv.origin_brand || "N/A",
    dueDate: new Date(inv.dueDate || inv.due_date),
    daysDiff: Number(inv.daysDiff || 0),
    balance_amount: Number(inv.balance_amount || 0),
  }));

  const handleSort = (field: keyof RadarInvoice) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedInvoices = [...cleanInvoices].sort((a, b) => {
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

  const renderSortIcon = (field: keyof RadarInvoice) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mt-6">
      <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-base">Radar de Cobranza (± 15 días)</h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {sortedInvoices.length} facturas activas
          </span>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Haz clic en cualquier columna para ordenar
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80 border-b border-slate-800/80 select-none">
            <tr>
              <th 
                onClick={() => handleSort("clientName")}
                className="px-6 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Cliente</span>
                  {renderSortIcon("clientName")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("invoice_number")}
                className="px-6 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Factura</span>
                  {renderSortIcon("invoice_number")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("vendorName")}
                className="px-6 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Vendedor</span>
                  {renderSortIcon("vendorName")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("origin_brand")}
                className="px-6 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Marca</span>
                  {renderSortIcon("origin_brand")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("dueDate")}
                className="px-6 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Vencimiento</span>
                  {renderSortIcon("dueDate")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("balance_amount")}
                className="px-6 py-3.5 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Saldo</span>
                  {renderSortIcon("balance_amount")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedInvoices.map((inv, idx) => (
              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-6 py-3.5 font-medium text-slate-200">
                  {inv.client_id ? (
                    <Link href={`/clients/${inv.client_id}`} className="hover:text-cyan-400 transition-colors underline decoration-slate-700 underline-offset-4">
                      {inv.clientName}
                    </Link>
                  ) : (
                    <span>{inv.clientName}</span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-slate-400 font-mono text-xs">
                  {inv.invoice_number}
                </td>
                <td className="px-6 py-3.5 text-slate-400">
                  {inv.vendorName}
                </td>
                <td className="px-6 py-3.5 text-slate-400">
                  <span className="bg-slate-800/80 border border-slate-700/60 text-slate-300 px-2.5 py-0.5 rounded-md text-xs font-mono font-medium">
                    {inv.origin_brand}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={inv.daysDiff < 0 ? "text-rose-400 font-semibold" : "text-amber-400 font-semibold"}>
                      {format(inv.dueDate, "dd MMM yyyy", { locale: es })}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                      inv.daysDiff < 0 
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20" 
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {inv.daysDiff < 0 ? `hace ${Math.abs(inv.daysDiff)} días` : `en ${inv.daysDiff} días`}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3.5 font-bold text-right text-emerald-400 font-mono">
                  ${inv.balance_amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {sortedInvoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                  No hay facturas pendientes en el radar de cobranza cercano (± 15 días).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
