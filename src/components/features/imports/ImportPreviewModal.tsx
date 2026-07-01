"use client";

import React, { useState } from "react";
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Users, 
  FileSpreadsheet, 
  Search, 
  Loader2, 
  ShieldAlert, 
  Database,
  ArrowRight
} from "lucide-react";
import type { ParseResult } from "@/actions/importTypes";

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  result: ParseResult | null;
  fileName?: string;
}

export default function ImportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  isSaving,
  result,
  fileName = "Archivo importado"
}: ImportPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"clients" | "warnings" | "discarded">("clients");
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen || !result || !result.clients) return null;

  const clients = result.clients;
  const totalInvoices = clients.reduce((acc, c) => acc + (c.invoices?.length || 0), 0);
  const totalBalance = clients.reduce((acc, c) => acc + (c.invoices?.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0) || 0), 0);
  
  // Detect duplicates or potential issues
  const invoiceNumbers = new Set<string>();
  const duplicateInvoices: { clientName: string; clientCode: string; invoiceNumber: string; amount: number }[] = [];
  
  clients.forEach(c => {
    c.invoices?.forEach(inv => {
      const key = `${c.code}-${inv.invoiceNumber}`;
      if (invoiceNumbers.has(key)) {
        duplicateInvoices.push({
          clientName: c.name,
          clientCode: c.code,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.balanceAmount
        });
      } else {
        invoiceNumbers.add(key);
      }
    });
  });

  const discardedLines = result.discardedLines || [];

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.cuitCuil && c.cuitCuil.includes(searchTerm))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabecera del Modal */}
        <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Pre-visualización y Validación del Lote</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-normal">
                  {result.brandDetected}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Archivo: <strong className="text-slate-200">{fileName}</strong> • {result.rawRowsRead || 0} filas leídas
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isSaving}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tarjetas KPI de Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 bg-slate-950/30 border-b border-slate-800/60">
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 shadow-inner">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Clientes Únicos</span>
            <div className="flex items-center gap-2 text-xl font-black text-white">
              <Users className="w-5 h-5 text-blue-400" />
              <span>{clients.length}</span>
            </div>
          </div>
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 shadow-inner">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Total Comprobantes</span>
            <div className="flex items-center gap-2 text-xl font-black text-white">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
              <span>{totalInvoices}</span>
            </div>
          </div>
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 shadow-inner">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Deuda Consolidada</span>
            <div className="flex items-center gap-2 text-xl font-black text-emerald-400">
              <span>${totalBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80 shadow-inner">
            <span className="text-xs font-semibold text-slate-400 block mb-1">Estado de Lectura</span>
            <div className="flex items-center gap-2 text-sm font-bold">
              {discardedLines.length > 0 ? (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> {discardedLines.length} avisos
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> 100% Ok
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navegación por Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("clients")}
            className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x ${
              activeTab === "clients"
                ? "bg-slate-900 text-cyan-400 border-slate-800 border-b-transparent shadow-sm"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes y Comprobantes ({clients.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("warnings")}
            className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x ${
              activeTab === "warnings"
                ? "bg-slate-900 text-amber-400 border-slate-800 border-b-transparent shadow-sm"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Duplicados / Alertas ({duplicateInvoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("discarded")}
            className={`px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 border-t border-x ${
              activeTab === "discarded"
                ? "bg-slate-900 text-rose-400 border-slate-800 border-b-transparent shadow-sm"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Excepciones Descartadas ({discardedLines.length})</span>
          </button>
        </div>

        {/* Contenido de Pestañas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: Clientes */}
          {activeTab === "clients" && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código, razón social o CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Razón Social</th>
                      <th className="px-4 py-3">CUIT / DNI</th>
                      <th className="px-4 py-3">Localidad</th>
                      <th className="px-4 py-3 text-center">Facturas</th>
                      <th className="px-4 py-3 text-right">Deuda Pendiente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredClients.slice(0, 100).map((c, idx) => {
                      const cBalance = c.invoices?.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0) || 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-bold text-cyan-400">{c.code}</td>
                          <td className="px-4 py-2.5 font-semibold text-white">{c.name}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-400">{c.cuitCuil || c.dni || "-"}</td>
                          <td className="px-4 py-2.5 text-slate-300">{c.locality}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              {c.invoices?.length || 0}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">
                            ${cBalance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredClients.length > 100 && (
                  <div className="p-3 text-center text-slate-400 bg-slate-950 text-xs font-mono border-t border-slate-800">
                    Mostrando los primeros 100 de {filteredClients.length} clientes...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Alertas / Duplicados */}
          {activeTab === "warnings" && (
            <div className="space-y-4">
              {duplicateInvoices.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/50 border border-slate-800/80 rounded-2xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">¡Sin Duplicados Detectados!</h4>
                  <p className="text-xs text-slate-400">No se han encontrado números de comprobante repetidos dentro de un mismo cliente en el archivo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Se detectaron <strong>{duplicateInvoices.length}</strong> comprobantes con el mismo número para el mismo código de cliente en el reporte. Revise si el archivo original incluye filas duplicadas.</span>
                  </div>
                  <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Nº Comprobante Duplicado</th>
                          <th className="px-4 py-3 text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                        {duplicateInvoices.map((d, idx) => (
                          <tr key={idx} className="hover:bg-amber-950/20 text-amber-200">
                            <td className="px-4 py-2.5 font-mono font-bold">{d.clientCode}</td>
                            <td className="px-4 py-2.5 font-semibold text-white">{d.clientName}</td>
                            <td className="px-4 py-2.5 font-mono text-amber-400 font-bold">{d.invoiceNumber}</td>
                            <td className="px-4 py-2.5 text-right font-mono">${d.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Líneas Descartadas */}
          {activeTab === "discarded" && (
            <div className="space-y-4">
              {discardedLines.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/50 border border-slate-800/80 rounded-2xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-white mb-1">¡Lectura Perfecta sin Excepciones!</h4>
                  <p className="text-xs text-slate-400">Todas las líneas tabulares e impresas fueron reconocidas exitosamente como clientes, facturas o encabezados del sistema.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                    <span>Se omitieron <strong>{discardedLines.length}</strong> líneas que no cumplían con el patrón de cabecera ni de factura en el reporte.</span>
                  </div>
                  <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold sticky top-0">
                        <tr>
                          <th className="px-4 py-3 w-16">Línea</th>
                          <th className="px-4 py-3">Contenido Omitido / Crudo</th>
                          <th className="px-4 py-3">Motivo del Descarte</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 font-mono">
                        {discardedLines.map((dl, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 text-slate-300">
                            <td className="px-4 py-2 font-bold text-slate-500">{dl.line}</td>
                            <td className="px-4 py-2 text-rose-300 truncate max-w-md">{dl.content}</td>
                            <td className="px-4 py-2 text-slate-400 text-[11px] font-sans">{dl.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancelar y Cambiar Archivo
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all text-white px-7 py-3 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 transform active:scale-95"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{isSaving ? "Consolidando en Supabase..." : `Aprobar e Importar ${clients.length} Clientes`}</span>
            {!isSaving && <ArrowRight className="w-4 h-4 ml-1" />}
          </button>
        </div>

      </div>
    </div>
  );
}
