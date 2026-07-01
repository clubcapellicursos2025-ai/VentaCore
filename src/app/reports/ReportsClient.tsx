"use client";

import React, { useState, useMemo } from "react";
import { Download, Filter } from "lucide-react";
import * as xlsx from "xlsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type ReportRow = {
  id: string;
  invoice_number: string;
  invoice_type: string;
  issue_date: string;
  due_date: string;
  original_amount: number;
  balance_amount: number;
  origin_brand: string;
  is_active: boolean;
  client_name: string;
  client_cuit: string;
  client_dni: string;
  client_locality: string;
  vendor_name: string;
  vendor_code: string;
};

export default function ReportsClient({ initialData }: { initialData: ReportRow[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");

  const filteredData = useMemo(() => {
    return initialData.filter(row => {
      let matchesSearch = true;
      let matchesBrand = true;
      let matchesVendor = true;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        matchesSearch = 
          row.client_name.toLowerCase().includes(term) ||
          row.invoice_number.toLowerCase().includes(term) ||
          row.client_cuit.includes(term) ||
          row.client_dni.includes(term) ||
          row.client_locality.toLowerCase().includes(term);
      }

      if (brandFilter) {
        matchesBrand = row.origin_brand === brandFilter;
      }

      if (vendorFilter) {
        matchesVendor = row.vendor_name === vendorFilter;
      }

      return matchesSearch && matchesBrand && matchesVendor;
    });
  }, [initialData, searchTerm, brandFilter, vendorFilter]);

  const brands = Array.from(new Set(initialData.map(d => d.origin_brand).filter(Boolean)));
  const vendors = Array.from(new Set(initialData.map(d => d.vendor_name).filter(Boolean)));

  const handleExportCSV = () => {
    const ws = xlsx.utils.json_to_sheet(filteredData.map(d => ({
      "Cliente": d.client_name,
      "DNI": d.client_dni,
      "CUIT": d.client_cuit,
      "Localidad": d.client_locality,
      "Factura": d.invoice_number,
      "Tipo": d.invoice_type,
      "Marca": d.origin_brand,
      "Vendedor": d.vendor_name,
      "Emisión": d.issue_date,
      "Vencimiento": d.due_date,
      "Importe Original": d.original_amount,
      "Saldo Pendiente": d.balance_amount
    })));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Reporte");
    xlsx.writeFile(wb, `Reporte_Cuentas_Corrientes_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 flex-1 w-full">
          <div className="relative flex-1 min-w-[200px]">
            <input 
              type="text" 
              placeholder="Buscar por cliente, factura, DNI..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <select 
            value={brandFilter} 
            onChange={(e) => setBrandFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Todas las Marcas</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select 
            value={vendorFilter} 
            onChange={(e) => setVendorFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos los Vendedores</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          Exportar a Excel
        </button>
      </div>
      
      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-950/80 sticky top-0">
            <tr>
              <th className="px-6 py-3 font-medium text-slate-400">Cliente</th>
              <th className="px-6 py-3 font-medium text-slate-400">CUIT / DNI</th>
              <th className="px-6 py-3 font-medium text-slate-400">Factura</th>
              <th className="px-6 py-3 font-medium text-slate-400">Marca</th>
              <th className="px-6 py-3 font-medium text-slate-400">Vendedor</th>
              <th className="px-6 py-3 font-medium text-slate-400">Vencimiento</th>
              <th className="px-6 py-3 font-medium text-slate-400 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredData.slice(0, 100).map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-200">
                  {row.client_name}
                </td>
                <td className="px-6 py-3 text-slate-400 text-xs">
                  {row.client_cuit !== '-' ? row.client_cuit : row.client_dni}
                </td>
                <td className="px-6 py-3 text-slate-400 font-mono text-xs">
                  {row.invoice_number}
                </td>
                <td className="px-6 py-3 text-slate-400">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">{row.origin_brand || 'N/A'}</span>
                </td>
                <td className="px-6 py-3 text-slate-400">
                  {row.vendor_name}
                </td>
                <td className="px-6 py-3 text-slate-400">
                  {row.due_date ? format(new Date(row.due_date), "dd MMM yyyy", { locale: es }) : "-"}
                </td>
                <td className="px-6 py-3 font-medium text-right text-emerald-400">
                  ${Number(row.balance_amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No hay datos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-500 text-center">
        Mostrando {Math.min(100, filteredData.length)} de {filteredData.length} registros. Usa la exportación para ver todos los datos.
      </div>
    </div>
  );
}
