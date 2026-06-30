import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { ClientSearchInput } from "@/components/features/search/ClientSearchInput";

export default async function ClientsPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.q || "";
  
  const supabase = await createClient();

  // Obtener clientes junto con sus facturas para calcular la deuda total
  let dbQuery = supabase
    .from("clients")
    .select(`
      id,
      client_code,
      name,
      identifier,
      locality,
      status,
      invoices (
        balance_amount
      )
    `)
    .order("name");

  if (query) {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }

  const { data: clients } = await dbQuery;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-slate-400 mt-1">Gestión de cartera, saldos y estado crediticio.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <ClientSearchInput />
          <Link 
            href="/clients/new" 
            className="bg-white text-slate-950 hover:bg-slate-200 transition-colors px-4 py-2.5 rounded-md font-medium text-sm w-full md:w-auto text-center"
          >
            Nuevo Cliente
          </Link>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-400">Cliente</th>
              <th className="px-6 py-4 font-medium text-slate-400">Identificador</th>
              <th className="px-6 py-4 font-medium text-slate-400">Localidad</th>
              <th className="px-6 py-4 font-medium text-slate-400 text-right">Deuda Total</th>
              <th className="px-6 py-4 font-medium text-slate-400">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {clients?.map((client) => {
              const totalDebt = client.invoices.reduce((acc: number, inv: any) => acc + Number(inv.balance_amount), 0);
              
              return (
                <tr key={client.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/clients/${client.id}`} className="font-medium text-slate-200 hover:text-emerald-400 transition-colors">
                      {client.name}
                    </Link>
                    <div className="text-xs text-slate-500 font-mono mt-1">Cód: {client.client_code}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {client.identifier ? (
                      client.identifier.includes("/") ? (
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span><strong className="text-slate-300 font-medium">DNI:</strong> {client.identifier.split("/")[0].trim()}</span>
                          <span><strong className="text-slate-300 font-medium">CUIT:</strong> {client.identifier.split("/")[1].trim()}</span>
                        </div>
                      ) : (
                        client.identifier
                      )
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-400">{client.locality || "-"}</td>
                  <td className="px-6 py-4 font-medium text-right text-emerald-400">
                    ${totalDebt.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                      client.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : client.status === 'blocked'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {client.status?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              );
            })}
            
            {(!clients || clients.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  {query ? (
                    <>No se encontraron clientes que coincidan con "<strong>{query}</strong>".</>
                  ) : (
                    <>No hay clientes registrados aún. Importa un archivo PDF para comenzar.</>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
