"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Briefcase, 
  Plus, 
  RefreshCw, 
  Search, 
  Edit, 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Sparkles, 
  ArrowUpDown, 
  X,
  AlertTriangle,
  Tag
} from "lucide-react";
import { 
  VendorData, 
  getVendorsList, 
  saveVendorAction, 
  deleteVendorAction, 
  syncOfficialVendorsAction 
} from "@/actions/vendorActions";

interface VendorsCrudClientProps {
  initialVendors: VendorData[];
}

type SortField = "name" | "vendor_code" | "status" | "uniqueClients" | "overdueDebt" | "totalDebt";
type SortOrder = "asc" | "desc";

const BRAND_NAMES = [
  "KeyNort - FullStock",
  "L'oreal - Matrix",
  "Wella - Farmavita"
];

export function VendorsCrudClient({ initialVendors }: VendorsCrudClientProps) {
  const [vendors, setVendors] = useState<VendorData[]>(initialVendors);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("vendor_code");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Estados de carga y modales
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorData | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formulario del modal
  const [formData, setFormData] = useState({
    name: "",
    vendor_code: "",
    status: "active",
    brand_keynort: "",
    brand_loreal: "",
    brand_wella: ""
  });

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const refreshList = async () => {
    setLoading(true);
    try {
      const data = await getVendorsList();
      setVendors(data);
    } catch (err: any) {
      console.error("Error refreshing vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormData({
      name: "",
      vendor_code: "",
      status: "active",
      brand_keynort: "",
      brand_loreal: "",
      brand_wella: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: VendorData) => {
    setEditingVendor(v);
    const bc = v.brand_codes || {};
    const getBrandStr = (keyMatch: string) => {
      for (const [k, val] of Object.entries(bc)) {
        if (k.toLowerCase().includes(keyMatch) && Array.isArray(val)) {
          return val.join(", ");
        }
      }
      return "";
    };

    setFormData({
      name: v.name,
      vendor_code: v.vendor_code,
      status: v.status || "active",
      brand_keynort: getBrandStr("keynort") || getBrandStr("fullstock"),
      brand_loreal: getBrandStr("loreal") || getBrandStr("matrix"),
      brand_wella: getBrandStr("wella") || getBrandStr("farmavita")
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.vendor_code) {
      showNotification("Nombre y Código son obligatorios.", "error");
      return;
    }

    const parseCodes = (str: string): string[] => {
      return str
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
    };

    const brand_codes: Record<string, string[]> = {};
    const kn = parseCodes(formData.brand_keynort);
    if (kn.length > 0) brand_codes["KeyNort - FullStock"] = kn;

    const lor = parseCodes(formData.brand_loreal);
    if (lor.length > 0) brand_codes["L'oreal - Matrix"] = lor;

    const wel = parseCodes(formData.brand_wella);
    if (wel.length > 0) brand_codes["Wella - Farmavita"] = wel;

    setLoading(true);
    try {
      await saveVendorAction({
        id: editingVendor?.id,
        name: formData.name,
        vendor_code: formData.vendor_code,
        status: formData.status,
        brand_codes
      });
      setIsModalOpen(false);
      showNotification(editingVendor ? "Vendedor actualizado exitosamente." : "Vendedor creado exitosamente.");
      await refreshList();
    } catch (err: any) {
      showNotification("Error al guardar: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (v: VendorData) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al vendedor "${v.name}" (Cód: ${v.vendor_code})?`)) {
      return;
    }
    setLoading(true);
    try {
      await deleteVendorAction(v.id);
      showNotification("Vendedor eliminado o inactivado correctamente.");
      await refreshList();
    } catch (err: any) {
      showNotification("Error al eliminar: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOfficial = async () => {
    if (!confirm("¿Deseas sincronizar automáticamente la plantilla oficial de 21 vendedores según el diagrama? Esto creará/actualizará los mapeos exactos para KeyNort, L'Oréal y Wella.")) {
      return;
    }
    setSyncing(true);
    try {
      const res = await syncOfficialVendorsAction();
      showNotification(res.message);
      await refreshList();
    } catch (err: any) {
      showNotification("Error durante la sincronización: " + err.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Filtrado y ordenado
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const matchesSearch = 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.vendor_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(v.brand_codes || {}).flat().some(c => String(c).toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" ? true : v.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "vendor_code") {
        const numA = parseInt(a.vendor_code, 10);
        const numB = parseInt(b.vendor_code, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortOrder === "asc" ? numA - numB : numB - numA;
        }
      }

      if (typeof valA === "string") {
        return sortOrder === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [vendors, searchTerm, statusFilter, sortField, sortOrder]);

  // KPIs
  const activeVendors = vendors.filter(v => v.status === "active").length;
  const vacantVendors = vendors.filter(v => v.status === "vacant" || v.status === "unassigned").length;
  const totalClientsAssigned = vendors.reduce((sum, v) => sum + v.uniqueClients, 0);
  const totalOverdue = vendors.reduce((sum, v) => sum + v.overdueDebt, 0);

  return (
    <div className="space-y-6 min-w-0 w-full max-w-full">
      {/* Notificación Toast/Banner */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between shadow-lg transition-all ${
          notification.type === "success" 
            ? "bg-emerald-950/80 border border-emerald-500/50 text-emerald-200" 
            : "bg-rose-950/80 border border-rose-500/50 text-rose-200"
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
            <span className="text-sm font-medium">{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-500" />
            Vendedores y Carteras Multi-Marca
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Administración integral de la fuerza de ventas y sus equivalencias de código para L'Oréal, KeyNort y Wella.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncOfficial}
            disabled={syncing || loading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
            Sincronizar Plantilla Oficial
          </button>

          <button
            onClick={handleOpenCreate}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Nuevo Vendedor
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Vendedores Activos</p>
              <p className="text-2xl font-bold text-white mt-1">{activeVendors}</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Puestos / Vacantes</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{vacantVendors}</p>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Clientes Asignados</p>
              <p className="text-2xl font-bold text-slate-200 mt-1">{totalClientsAssigned}</p>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Tag className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Deuda Vencida Total</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">
                ${totalOverdue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-2.5 bg-rose-500/10 rounded-lg text-rose-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar y Buscador */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, cód o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activos</option>
            <option value="vacant">Vacantes</option>
            <option value="inactive">Inactivos / Otros</option>
          </select>

          <button
            onClick={refreshList}
            disabled={loading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
            Relación Oficial de Vendedores y Códigos según Archivo
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mapeo multi-marca según diagrama. Cada vendedor puede tener un número de código distinto en cada tipo de documento o indicar <span className="italic text-slate-300">&quot;Sin valor asignado en este tipo de documento&quot;</span>.
          </p>
        </div>
      </div>

      {/* Grilla de Vendedores */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl min-w-0 w-full max-w-full">
        <div className="overflow-x-auto overflow-y-auto max-h-[70vh] w-full scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th onClick={() => handleSort("vendor_code")} className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1.5">
                    Cód
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th onClick={() => handleSort("name")} className="px-6 py-3.5 cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center gap-1.5">
                    Vendedor / Estado
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="px-6 py-3.5">KeyNort - FullStock</th>
                <th className="px-6 py-3.5">L´oreal - Matrix</th>
                <th className="px-6 py-3.5">Wella - Farmavita</th>
                <th onClick={() => handleSort("uniqueClients")} className="px-6 py-3.5 text-right cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center justify-end gap-1.5">
                    Clientes
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th onClick={() => handleSort("overdueDebt")} className="px-6 py-3.5 text-right cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center justify-end gap-1.5">
                    Deuda Vencida
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th onClick={() => handleSort("totalDebt")} className="px-6 py-3.5 text-right cursor-pointer hover:text-white transition-colors">
                  <div className="flex items-center justify-end gap-1.5">
                    Deuda Total
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="px-6 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredVendors.map((v) => {
                const bc = v.brand_codes || {};
                
                const getBrandArray = (keyMatch: string): string[] => {
                  for (const [k, val] of Object.entries(bc)) {
                    if (k.toLowerCase().includes(keyMatch) && Array.isArray(val)) {
                      return val;
                    }
                  }
                  return [];
                };

                const keynortCodes = getBrandArray("keynort").length > 0 ? getBrandArray("keynort") : getBrandArray("fullstock");
                const lorealCodes = getBrandArray("loreal").length > 0 ? getBrandArray("loreal") : getBrandArray("matrix");
                const wellaCodes = getBrandArray("wella").length > 0 ? getBrandArray("wella") : getBrandArray("farmavita");

                return (
                  <tr key={v.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-300">
                      #{v.vendor_code}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div>
                          <Link href={`/vendors/${v.id}`} className="font-semibold text-white hover:text-blue-400 transition-colors">
                            {v.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                              v.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              v.status === 'vacant' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-slate-800 text-slate-400'
                            }`}>
                              {v.status === 'active' ? 'Activo' : v.status === 'vacant' ? 'Vacante' : v.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {keynortCodes.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/80 border border-blue-500/30 text-blue-300 rounded-md text-xs font-mono font-bold">
                          Cód: {keynortCodes.join(", ")}
                        </span>
                      ) : (
                        <span className="inline-block max-w-[200px] whitespace-normal text-center leading-tight px-2 py-1 bg-slate-950/60 border border-slate-800/60 text-slate-500 text-[11px] italic rounded">
                          Sin valor asignado en este tipo de documento
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {lorealCodes.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/80 border border-purple-500/30 text-purple-300 rounded-md text-xs font-mono font-bold">
                          Cód: {lorealCodes.join(", ")}
                        </span>
                      ) : (
                        <span className="inline-block max-w-[200px] whitespace-normal text-center leading-tight px-2 py-1 bg-slate-950/60 border border-slate-800/60 text-slate-500 text-[11px] italic rounded">
                          Sin valor asignado en este tipo de documento
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {wellaCodes.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/80 border border-amber-500/30 text-amber-300 rounded-md text-xs font-mono font-bold">
                          Cód: {wellaCodes.join(", ")}
                        </span>
                      ) : (
                        <span className="inline-block max-w-[200px] whitespace-normal text-center leading-tight px-2 py-1 bg-slate-950/60 border border-slate-800/60 text-slate-500 text-[11px] italic rounded">
                          Sin valor asignado en este tipo de documento
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-300">
                      {v.uniqueClients}
                    </td>
                    <td className={`px-6 py-4 text-right font-semibold ${v.overdueDebt > 0 ? "text-rose-400" : "text-slate-400"}`}>
                      ${v.overdueDebt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-400">
                      ${v.totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/vendors/${v.id}`}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition-colors"
                          title="Ver Ficha de Cartera"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title="Editar Vendedor"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(v)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded-lg transition-colors"
                          title="Eliminar o Inactivar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredVendors.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    No se encontraron vendedores que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Creación / Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">
                {editingVendor ? `Editar Vendedor: ${editingVendor.name}` : "Nuevo Vendedor"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Sebastián Sánchez"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Cód Oficial *</label>
                  <input
                    type="text"
                    required
                    value={formData.vendor_code}
                    onChange={(e) => setFormData({ ...formData, vendor_code: e.target.value })}
                    placeholder="Ej: 1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase">Estado del Puesto</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="active">Activo (Operativo)</option>
                  <option value="vacant">Vacante (Puesto Libre u Oficial)</option>
                  <option value="inactive">Inactivo / Desvinculado</option>
                  <option value="unassigned">Pendiente de Asignación</option>
                </select>
              </div>

              {/* Sección de Equivalencias Multi-Marca */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-blue-400">Equivalencias de Código por Marca</h4>
                  <p className="text-xs text-slate-400">
                    Ingresa los códigos numéricos separados por coma. Al importar facturas de cada marca, el sistema asignará las ventas según estos valores.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-blue-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    KeyNort - FullStock (Códigos):
                  </label>
                  <input
                    type="text"
                    value={formData.brand_keynort}
                    onChange={(e) => setFormData({ ...formData, brand_keynort: e.target.value })}
                    placeholder="Ej: 1, 15"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-purple-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    L'Oréal - Matrix (Códigos):
                  </label>
                  <input
                    type="text"
                    value={formData.brand_loreal}
                    onChange={(e) => setFormData({ ...formData, brand_loreal: e.target.value })}
                    placeholder="Ej: 3, 15"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Wella - Farmavita (Códigos):
                  </label>
                  <input
                    type="text"
                    value={formData.brand_wella}
                    onChange={(e) => setFormData({ ...formData, brand_wella: e.target.value })}
                    placeholder="Ej: 15"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Guardar Vendedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
