import Link from "next/link";
import { LayoutDashboard, Users, Database, Settings, Briefcase, Tag } from "lucide-react";

export function Sidebar() {
  return (
    <div className="w-64 border-r border-slate-800 bg-slate-950/50 flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 font-bold text-lg tracking-tight">
        VentaCore
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>
        <Link href="/clients" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
          <Users className="w-5 h-5" />
          Clientes
        </Link>
        <Link href="/vendors" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
          <Briefcase className="w-5 h-5" />
          Vendedores
        </Link>
        <Link href="/brands" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
          <Tag className="w-5 h-5" />
          Marcas
        </Link>
        <Link href="/imports" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
          <Database className="w-5 h-5" />
          Importaciones
        </Link>
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button className="flex w-full items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
          <Settings className="w-5 h-5" />
          Configuración
        </button>
      </div>
    </div>
  );
}
