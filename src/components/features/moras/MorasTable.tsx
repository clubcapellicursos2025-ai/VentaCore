"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Download } from "lucide-react";

export interface MoraRow {
  id: string;
  clientId: string;
  clientName: string;
  locality: string;
  invoice_number: string;
  origin_brand: string;
  vendorName: string;
  daysLate: number;
  balance: number;
}

export function MorasTable({ initialInvoices }: { initialInvoices: MoraRow[] }) {
  const router = useRouter();
  const [sortField, setSortField] = useState<keyof MoraRow>("balance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (field: keyof MoraRow) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "balance" || field === "daysLate" ? "desc" : "asc");
    }
  };

  const sortedInvoices = [...initialInvoices].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string") valA = valA.toLowerCase();
    if (typeof valB === "string") valB = valB.toLowerCase();

    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const exportToCSV = () => {
    const headers = ["Cliente", "Localidad", "Factura", "Marca", "Vendedor", "Días Mora", "Saldo"];
    const rows = sortedInvoices.map(i => [
      `"${(i.clientName || "").replace(/"/g, '""')}"`,
      `"${(i.locality || "").replace(/"/g, '""')}"`,
      `"${i.invoice_number}"`,
      `"${i.origin_brand}"`,
      `"${(i.vendorName || "").replace(/"/g, '""')}"`,
      i.daysLate,
      i.balance
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Top50_Mayores_Deudores_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIcon = (field: keyof MoraRow) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors ml-1 inline" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-cyan-400 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-cyan-400 ml-1 inline" />
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mt-6">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-white">Top 50 Mayores Deudores</h3>
          <span className="text-xs text-slate-400">Haz clic en los encabezados para ordenar</span>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          Exportar CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-950/80 select-none">
            <tr>
              <th className="px-6 py-3 font-medium text-slate-400">Riesgo</th>
              <th 
                onClick={() => handleSort("clientName")}
                className="px-6 py-3 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors group"
              >
                Cliente {renderSortIcon("clientName")}
              </th>
              <th 
                onClick={() => handleSort("locality")}
                className="px-6 py-3 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors group"
              >
                Localidad {renderSortIcon("locality")}
              </th>
              <th 
                onClick={() => handleSort("invoice_number")}
                className="px-6 py-3 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors group"
              >
                Factura {renderSortIcon("invoice_number")}
              </th>
              <th 
                onClick={() => handleSort("origin_brand")}
                className="px-6 py-3 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors group"
              >
                Origen {renderSortIcon("origin_brand")}
              </th>
              <th 
                onClick={() => handleSort("vendorName")}
                className="px-6 py-3 font-medium text-slate-400 cursor-pointer hover:text-white transition-colors group"
              >
                Vendedor {renderSortIcon("vendorName")}
              </th>
              <th 
                onClick={() => handleSort("daysLate")}
                className="px-6 py-3 font-medium text-slate-400 text-right cursor-pointer hover:text-white transition-colors group"
              >
                Días Mora {renderSortIcon("daysLate")}
              </th>
              <th 
                onClick={() => handleSort("balance")}
                className="px-6 py-3 font-medium text-slate-400 text-right cursor-pointer hover:text-white transition-colors group"
              >
                Saldo {renderSortIcon("balance")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedInvoices.map((inv, idx) => (
              <tr 
                key={`${inv.id}-${idx}`} 
                onClick={() => inv.clientId && router.push(`/clients/${inv.clientId}`)}
                className={`hover:bg-slate-800/50 transition-colors group/row ${inv.clientId ? 'cursor-pointer' : ''}`}
              >
                <td className="px-6 py-3">
                  <span className={`w-3 h-3 rounded-full inline-block ${inv.daysLate > 60 ? 'bg-rose-500' : inv.daysLate > 30 ? 'bg-amber-500' : 'bg-yellow-500'}`}></span>
                </td>
                <td className="px-6 py-3 font-medium text-slate-200">
                  {inv.clientId ? (
                    <Link 
                      href={`/clients/${inv.clientId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5 group-hover/row:underline decoration-cyan-500/50 underline-offset-4"
                    >
                      <span>{inv.clientName}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/row:opacity-100 transition-opacity text-cyan-400" />
                    </Link>
                  ) : (
                    inv.clientName
                  )}
                </td>
                <td className="px-6 py-3 text-slate-400">
                  {inv.locality}
                </td>
                <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                  {inv.invoice_number}
                </td>
                <td className="px-6 py-3 text-slate-400">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">
                    {inv.origin_brand}
                  </span>
                </td>
                <td className="px-6 py-3 text-slate-400">
                  {inv.vendorName}
                </td>
                <td className="px-6 py-3 text-right font-medium">
                  <span className={inv.daysLate > 30 ? "text-rose-400" : "text-amber-400"}>
                    {inv.daysLate}
                  </span>
                </td>
                <td className="px-6 py-3 font-medium text-right text-rose-400">
                  ${inv.balance.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {sortedInvoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                  Excelente, no hay moras registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
