"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown, Users, AlertTriangle, ExternalLink, ShieldCheck, Clock } from "lucide-react";

interface ClientRow {
  id: string;
  client_code: string;
  name: string;
  identifier: string;
  locality: string;
  address?: string;
  status: string;
  invoicesCount: number;
  totalDebt: number;
  overdueDebt: number;
  vendorName?: string;
}

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();
  const [sortField, setSortField] = useState<keyof ClientRow>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [vendorFilter, setVendorFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleSort = (field: keyof ClientRow) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const vendorsList = Array.from(new Set(clients.map(c => c.vendorName).filter(Boolean))) as string[];

  const filteredClients = clients.filter(c => {
    if (vendorFilter !== "ALL" && c.vendorName !== vendorFilter) return false;
    if (statusFilter === "ACTIVE" && c.status === "blocked") return false;
    if (statusFilter === "BLOCKED" && c.status !== "blocked") return false;
    if (statusFilter === "DEBT" && c.overdueDebt <= 0) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchDni = (c.identifier || "").toLowerCase().includes(q);
      const matchCode = (c.client_code || "").toLowerCase().includes(q);
      const matchName = (c.name || "").toLowerCase().includes(q);
      const matchLocality = (c.locality || "").toLowerCase().includes(q);
      return matchDni || matchCode || matchName || matchLocality;
    }
    return true;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    let valA = a[sortField] || "";
    let valB = b[sortField] || "";

    if (typeof valA === "string" && typeof valB === "string") {
      return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return sortDir === "asc" ? valA - valB : valB - valA;
    }

    return 0;
  });

  const exportToCSV = () => {
    const headers = ["Código", "Cliente", "DNI/CUIT", "Localidad", "Vendedor", "Facturas", "Deuda Vencida", "Deuda Total", "Estado"];
    const rows = sortedClients.map(c => [
      `"${c.client_code || ""}"`,
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.identifier || "").replace(/"/g, '""')}"`,
      `"${(c.locality || "").replace(/"/g, '""')}"`,
      `"${(c.vendorName || "").replace(/"/g, '""')}"`,
      c.invoicesCount,
      c.overdueDebt,
      c.totalDebt,
      `"${c.status || "active"}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cartera_Clientes_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIcon = (field: keyof ClientRow) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />;
  };

  const formatCurrency = (num: number) => 
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(num);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950/90 via-slate-900/90 to-slate-950/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>Cartera Oficial de Clientes</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {sortedClients.length} activos
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Filtra por DNI/CUIT o vendedor y exporta la cartera en CSV.
              </p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-blue-500/20 self-start sm:self-auto"
          >
            <span>Exportar CSV</span>
          </button>
        </div>

        {/* Filtros rápidos multicriterio */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtro rápido por DNI, CUIT, código o nombre..."
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-blue-500 min-w-[240px]"
          />
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos los Vendedores</option>
            {vendorsList.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="ACTIVE">Solo Activos</option>
            <option value="DEBT">Con Mora / Deuda</option>
            <option value="BLOCKED">Bloqueados</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80 border-b border-slate-800/80 select-none">
            <tr>
              <th 
                onClick={() => handleSort("client_code")}
                className="px-5 py-4 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Código</span>
                  {renderSortIcon("client_code")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("name")}
                className="px-5 py-4 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Cliente / Razón Social</span>
                  {renderSortIcon("name")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("identifier")}
                className="px-5 py-4 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>DNI / CUIT</span>
                  {renderSortIcon("identifier")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("locality")}
                className="px-5 py-4 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Localidad / Domicilio</span>
                  {renderSortIcon("locality")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("invoicesCount")}
                className="px-5 py-4 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Facturas</span>
                  {renderSortIcon("invoicesCount")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("overdueDebt")}
                className="px-5 py-4 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Deuda Vencida (Mora)</span>
                  {renderSortIcon("overdueDebt")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("totalDebt")}
                className="px-5 py-4 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Deuda Total</span>
                  {renderSortIcon("totalDebt")}
                </div>
              </th>
              <th 
                onClick={() => handleSort("status")}
                className="px-5 py-4 font-semibold text-slate-300 cursor-pointer hover:bg-slate-800/60 transition-colors group text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Estado</span>
                  {renderSortIcon("status")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedClients.map((c) => (
              <tr 
                key={c.id} 
                className="hover:bg-slate-800/40 transition-colors group/row"
              >
                <td className="px-5 py-4 font-mono font-bold text-cyan-400 text-xs">
                  {c.client_code || "-"}
                </td>
                <td className="px-5 py-4">
                  <Link 
                    href={`/clients/${c.id}`} 
                    className="font-bold text-slate-200 hover:text-cyan-400 transition-colors inline-flex items-center gap-1.5 text-base group-hover/row:underline decoration-cyan-500/50 underline-offset-4 cursor-pointer"
                  >
                    <span>{c.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/row:opacity-100 transition-opacity text-cyan-400" />
                  </Link>
                  {c.vendorName && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Vendedor: <span className="text-slate-400 font-medium">{c.vendorName}</span>
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-400 font-mono text-xs">
                  {c.identifier ? (
                    c.identifier.includes("/") ? (
                      <div className="flex flex-col gap-0.5">
                        <span><strong className="text-slate-300">DNI:</strong> {c.identifier.split("/")[0].trim()}</span>
                        <span><strong className="text-slate-300">CUIT:</strong> {c.identifier.split("/")[1].trim()}</span>
                      </div>
                    ) : (
                      c.identifier
                    )
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-5 py-4 text-slate-300 text-xs">
                  <div className="font-medium text-slate-200">{c.locality || "-"}</div>
                  {c.address && <div className="text-slate-500 text-[11px] mt-0.5 truncate max-w-[180px]">{c.address}</div>}
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold">
                    {c.invoicesCount}
                  </span>
                </td>
                <td className="px-5 py-4 text-right font-mono font-semibold">
                  {c.overdueDebt > 0 ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-rose-400 inline-flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-xs">
                        <Clock className="w-3 h-3" />
                        {formatCurrency(c.overdueDebt)}
                      </span>
                      <span className="animate-pulse bg-rose-600/90 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-sm">
                        MORA CRÍTICA
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs">$0.00</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400 text-base">
                  {formatCurrency(c.totalDebt)}
                </td>
                <td className="px-5 py-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    c.status === "active" || !c.status
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : c.status === "blocked"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {c.status === "blocked" ? <AlertTriangle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                    {c.status ? c.status.toUpperCase() : "ACTIVO"}
                  </span>
                </td>
              </tr>
            ))}
            {sortedClients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  No se encontraron clientes que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
