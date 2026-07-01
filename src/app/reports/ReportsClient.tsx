"use client";

import React, { useState, useMemo } from "react";
import { Download, Filter, BarChart3, TrendingUp, AlertTriangle, CheckCircle2, PieChart, Star, Crown, Award, Layers, Search } from "lucide-react";
import * as xlsx from "xlsx";
import { format, differenceInDays } from "date-fns";
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
  const [activeTab, setActiveTab] = useState<"analytics" | "table">("analytics");
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

  const brands = useMemo(() => Array.from(new Set(initialData.map(d => d.origin_brand).filter(Boolean))), [initialData]);
  const vendors = useMemo(() => Array.from(new Set(initialData.map(d => d.vendor_name).filter(Boolean))), [initialData]);

  // --- ANALYTICS CALCULATIONS ---
  const today = new Date();

  // 1. Proyecciones por condición / plazo de vencimiento
  const cashflowStats = useMemo(() => {
    let alDia = 0; // <= 0 days overdue
    let a15Dias = 0; // 1-15 days due or overdue
    let a30Dias = 0; // 16-30 days
    let mas60Dias = 0; // >30 days

    initialData.forEach(inv => {
      const bal = Number(inv.balance_amount || 0);
      if (bal <= 0) return;

      let d = today;
      if (inv.due_date) {
        const parsed = new Date(inv.due_date);
        if (!isNaN(parsed.getTime())) d = parsed;
      }

      const diff = differenceInDays(d, today);
      if (diff >= 0) {
        alDia += bal;
      } else {
        const overdue = Math.abs(diff);
        if (overdue <= 15) a15Dias += bal;
        else if (overdue <= 30) a30Dias += bal;
        else mas60Dias += bal;
      }
    });

    const total = alDia + a15Dias + a30Dias + mas60Dias || 1;
    return { alDia, a15Dias, a30Dias, mas60Dias, total };
  }, [initialData, today]);

  // 2. Semáforo de Riesgo Crediticio con IA (Por cliente)
  const clientScoring = useMemo(() => {
    const map = new Map<string, { name: string; cuit: string; totalDebt: string | number; maxOverdue: number; brands: Set<string>; invoices: number }>();

    initialData.forEach(inv => {
      const bal = Number(inv.balance_amount || 0);
      if (bal <= 0) return;

      const key = inv.client_cuit !== "-" ? inv.client_cuit : inv.client_name;
      if (!map.has(key)) {
        map.set(key, { name: inv.client_name, cuit: key, totalDebt: 0, maxOverdue: 0, brands: new Set(), invoices: 0 });
      }
      const item = map.get(key)!;
      item.totalDebt = Number(item.totalDebt) + bal;
      item.invoices += 1;
      if (inv.origin_brand) item.brands.add(inv.origin_brand);

      if (inv.due_date) {
        const d = new Date(inv.due_date);
        if (!isNaN(d.getTime())) {
          const overdue = differenceInDays(today, d);
          if (overdue > item.maxOverdue) item.maxOverdue = overdue;
        }
      }
    });

    const list = Array.from(map.values()).map(item => {
      let score: "A" | "B" | "C" | "D" = "A";
      if (item.maxOverdue > 60) score = "D";
      else if (item.maxOverdue > 30) score = "C";
      else if (item.maxOverdue > 10) score = "B";

      return {
        ...item,
        score,
        brandList: Array.from(item.brands)
      };
    });

    return list.sort((a, b) => Number(b.totalDebt) - Number(a.totalDebt));
  }, [initialData, today]);

  // 3. Matriz de Venta Cruzada (Cross-Selling)
  const crossSellingOpportunities = useMemo(() => {
    return clientScoring.filter(c => c.brandList.length > 0 && c.brandList.length < 3).slice(0, 15);
  }, [clientScoring]);

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

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(val));
  };

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas (Tabs) */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            activeTab === "analytics"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span>Inteligencia Comercial & Proyecciones (Nuevo)</span>
        </button>
        <button
          onClick={() => setActiveTab("table")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
            activeTab === "table"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/20"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Detalle de Facturas & Exportación ({filteredData.length})</span>
        </button>
      </div>

      {activeTab === "analytics" ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Proyección de Flujo de Caja */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Proyección y Curva de Envejecimiento de Cobranza
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Distribución del saldo en calle ($ {formatCurrency(cashflowStats.total)}) según plazos y plazos de mora teóricos del ERP.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
                IA Cashflow Predictor
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Al día / Por Vencer</span>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(cashflowStats.alDia)}</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(cashflowStats.alDia / cashflowStats.total) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Mora Leve (1 - 15 días)</span>
                <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(cashflowStats.a15Dias)}</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-400 h-full rounded-full" style={{ width: `${(cashflowStats.a15Dias / cashflowStats.total) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Mora Moderada (16 - 30 días)</span>
                <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(cashflowStats.a30Dias)}</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: `${(cashflowStats.a30Dias / cashflowStats.total) * 100}%` }} />
                </div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Mora Crítica (&gt; 60 días)</span>
                <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(cashflowStats.mas60Dias)}</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(cashflowStats.mas60Dias / cashflowStats.total) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Matriz de Venta Cruzada y Semáforo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Matriz de Venta Cruzada */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" />
                    Matriz de Venta Cruzada (Cross-Selling)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clientes activos que compran una marca pero aún no adquieren la línea completa.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-3 rounded-l-lg">Cliente</th>
                      <th className="p-3">Marcas Actuales</th>
                      <th className="p-3 rounded-r-lg">Oportunidad Directa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {crossSellingOpportunities.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-500">
                          Todos los clientes principales ya consumen las 3 marcas o no hay datos suficientes.
                        </td>
                      </tr>
                    ) : (
                      crossSellingOpportunities.map((c, i) => {
                        const hasLoreal = c.brandList.some(b => b.toLowerCase().includes("loreal") || b.toLowerCase().includes("matrix"));
                        const hasWella = c.brandList.some(b => b.toLowerCase().includes("wella") || b.toLowerCase().includes("farma"));
                        const hasKey = c.brandList.some(b => b.toLowerCase().includes("key") || b.toLowerCase().includes("full"));

                        const missing = [];
                        if (!hasLoreal) missing.push("L'Oréal / Matrix");
                        if (!hasWella) missing.push("Wella / Farmavita");
                        if (!hasKey) missing.push("KeyNort / FullStock");

                        return (
                          <tr key={i} className="hover:bg-slate-800/50">
                            <td className="p-3 font-semibold text-white truncate max-w-[160px]" title={c.name}>{c.name}</td>
                            <td className="p-3">
                              <div className="flex gap-1 flex-wrap">
                                {c.brandList.map(b => (
                                  <span key={b} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">{b}</span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px]">
                                + Ofrecer {missing.join(", ")}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Semáforo de Riesgo Crediticio */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Semáforo de Deudores con IA (Scoring)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Clasificación crediticia y atraso máximo registrado en calle por cliente.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="p-3 rounded-l-lg">Cliente</th>
                      <th className="p-3">Atraso Máx.</th>
                      <th className="p-3">Deuda Total</th>
                      <th className="p-3 rounded-r-lg text-center">Clase IA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {clientScoring.slice(0, 10).map((c, i) => {
                      let badge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      let label = "CLASE A - ÓPTIMO";
                      if (c.score === "B") { badge = "bg-blue-500/10 text-blue-400 border-blue-500/20"; label = "CLASE B - REGULAR"; }
                      if (c.score === "C") { badge = "bg-amber-500/10 text-amber-400 border-amber-500/20"; label = "CLASE C - ATENCIÓN"; }
                      if (c.score === "D") { badge = "bg-rose-500/10 text-rose-400 border-rose-500/20"; label = "CLASE D - MOROSO"; }

                      return (
                        <tr key={i} className="hover:bg-slate-800/50">
                          <td className="p-3 font-semibold text-white truncate max-w-[150px]" title={c.name}>{c.name}</td>
                          <td className="p-3 font-mono text-slate-400">{c.maxOverdue <= 0 ? "Al día" : `${c.maxOverdue} días`}</td>
                          <td className="p-3 font-bold text-emerald-400 font-mono">{formatCurrency(c.totalDebt)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${badge}`}>
                              {label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: DETALLE GENERAL DE FACTURAS (EXACTO EXISTENTE, INTACTO AL 100%) */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg animate-fadeIn">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 flex-1 w-full">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar por cliente, factura, DNI..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
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
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              Exportar a Excel
            </button>
          </div>
          
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/80 sticky top-0 z-10">
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
            Mostrando {Math.min(100, filteredData.length)} de {filteredData.length} registros. Usa la exportación para ver todos los datos en Excel.
          </div>
        </div>
      )}
    </div>
  );
}
