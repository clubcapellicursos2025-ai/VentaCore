import { Bell, Search, User } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between px-6">
      <div className="flex-1 flex items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar clientes por CUIT, nombre... (Cmd+K)" 
            className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-white transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-sm font-medium border border-slate-700">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
}
