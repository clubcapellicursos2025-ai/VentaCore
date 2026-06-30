"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search, User, FileText, Settings, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface OmnibarProps {
  clients: { id: string; name: string; client_code: string }[];
}

export function Omnibar({ clients = [] }: OmnibarProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-xl rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col relative">
        <Command
          className="w-full h-full flex flex-col"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-slate-800 px-3">
            <Search className="w-5 h-5 text-slate-500 shrink-0" />
            <Command.Input 
              autoFocus
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-slate-200 px-3 py-4 text-base placeholder:text-slate-500" 
              placeholder="Buscar cliente, factura o comando..." 
            />
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-800 rounded-md text-slate-500 hover:text-slate-300">
               <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-500">
              No se encontraron resultados.
            </Command.Empty>

            <Command.Group heading="Clientes" className="px-2 text-xs font-medium text-slate-500 mb-2 mt-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
              {clients.map((c) => (
                <Command.Item 
                  key={c.id}
                  value={`${c.name} ${c.client_code}`}
                  onSelect={() => { router.push(`/clients/${c.id}`); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-md hover:bg-slate-800 cursor-pointer aria-selected:bg-emerald-500/10 aria-selected:text-emerald-400"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="flex flex-col">
                    <span>{c.name}</span>
                    <span className="text-xs text-slate-500">Cód: {c.client_code}</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Acciones Rápidas" className="px-2 text-xs font-medium text-slate-500 mb-2 mt-4 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1">
              <Command.Item 
                onSelect={() => { router.push("/imports"); setOpen(false); }}
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-md hover:bg-slate-800 cursor-pointer aria-selected:bg-slate-800"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                Nueva Importación de Deuda
              </Command.Item>
              <Command.Item 
                className="flex items-center gap-3 px-3 py-2 text-sm text-slate-200 rounded-md hover:bg-slate-800 cursor-pointer aria-selected:bg-slate-800"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Configurar Reglas de Riesgo
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
