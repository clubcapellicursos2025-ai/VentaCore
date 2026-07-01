"use client";

import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Search, 
  FileSpreadsheet, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  User, 
  Filter, 
  Database,
  Lock,
  ChevronDown,
  ChevronRight,
  Activity
} from "lucide-react";
import { AuditLogItem } from "@/actions/auditActions";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";

interface AuditClientProps {
  initialLogs: AuditLogItem[];
}

export default function AuditClient({ initialLogs }: AuditClientProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || log.event_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [logs, searchTerm, filterType]);

  const stats = useMemo(() => {
    const total = logs.length;
    const imports = logs.filter(l => l.event_type === "import").length;
    const errors = logs.filter(l => l.status === "error").length;
    const success = logs.filter(l => l.status === "success").length;
    return { total, imports, errors, success };
  }, [logs]);

  const getBadge = (type: string, status: string) => {
    if (status === "error") {
      return { label: "Fallo / Excepción", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertTriangle };
    }
    switch (type) {
      case "import":
        return { label: "Carga ERP", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: FileSpreadsheet };
      case "vendor_sync":
        return { label: "Cartera Comercial", bg: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: RefreshCw };
      case "security":
        return { label: "Seguridad y Accesos", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Lock };
      default:
        return { label: "Operación de Sistema", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: Activity };
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return "-";
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Auditoría y Seguridad del Sistema</h1>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Aislamiento Multi-Tenant Activo
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Registro inmutable de importaciones, transferencias de cartera y sincronizaciones del motor VentaCore.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-xs font-mono text-indigo-300 self-stretch md:self-auto justify-center">
          <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Partición por Empresa (RLS)</span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Eventos Registrados</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          <div className="absolute top-4 right-4 text-slate-700">
            <Database className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cargas ERP (L'Oréal / Key / Wella)</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{stats.imports}</p>
          <div className="absolute top-4 right-4 text-blue-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Operaciones Exitosas</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.success}</p>
          <div className="absolute top-4 right-4 text-emerald-500/20">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Alertas / Excepciones</p>
          <p className={`text-3xl font-bold mt-1 ${stats.errors > 0 ? "text-rose-400" : "text-slate-500"}`}>{stats.errors}</p>
          <div className="absolute top-4 right-4 text-rose-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por archivo, usuario o acción..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === "all" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            Todos ({logs.length})
          </button>
          <button
            onClick={() => setFilterType("import")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === "import" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            Importaciones ERP
          </button>
          <button
            onClick={() => setFilterType("vendor_sync")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterType === "vendor_sync" ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            Cartera Vendedores
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-base font-medium text-slate-300">No se encontraron registros que coincidan</p>
            <p className="text-xs mt-1">Intenta cambiar los filtros de búsqueda o categoría.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getBadge(log.event_type, log.status);
            const Icon = badge.icon;
            const isExpanded = expandedId === log.id;

            let timeAgo = "Hace instantes";
            let exactDate = log.created_at;
            try {
              const d = new Date(log.created_at);
              timeAgo = formatDistanceToNow(d, { addSuffix: true, locale: es });
              exactDate = format(d, "dd/MM/yyyy HH:mm:ss");
            } catch {}

            return (
              <div
                key={log.id}
                className={`bg-slate-900 border transition-all rounded-2xl overflow-hidden ${
                  isExpanded ? "border-indigo-500/50 shadow-xl bg-slate-900/90" : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${badge.bg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm truncate">{log.action}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 break-all">{log.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden md:block">
                      <div className="text-xs font-medium text-slate-300 flex items-center justify-end gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span>{log.user_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-0.5" title={exactDate}>
                        <Clock className="w-3 h-3" />
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                    
                    <button className="text-slate-500 hover:text-white p-1">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 bg-slate-950/60 text-xs space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Identificador de Evento</span>
                        <span className="font-mono text-indigo-300">{log.id}</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Fecha Exacta</span>
                        <span className="text-slate-200">{exactDate}</span>
                      </div>
                      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block mb-1 font-semibold uppercase text-[10px]">Estado de Validación</span>
                        <span className={log.status === "error" ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                          {log.status === "error" ? "Fallido / Revisar" : "Procesado Correctamente"}
                        </span>
                      </div>
                    </div>

                    {log.metadata && (
                      <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Métricas y Volúmenes del Proceso
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                          {log.metadata.total_clients !== undefined && (
                            <div>
                              <span className="text-slate-500 block">Clientes Sincronizados:</span>
                              <span className="font-bold text-white">{log.metadata.total_clients}</span>
                            </div>
                          )}
                          {log.metadata.total_invoices !== undefined && (
                            <div>
                              <span className="text-slate-500 block">Facturas Procesadas:</span>
                              <span className="font-bold text-white">{log.metadata.total_invoices}</span>
                            </div>
                          )}
                          {log.metadata.total_balance !== undefined && (
                            <div>
                              <span className="text-slate-500 block">Saldo Pendiente Impactado:</span>
                              <span className="font-bold text-emerald-400">{formatCurrency(log.metadata.total_balance)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
