"use server";

import { createClient } from "@/utils/supabase/server";
import type { ParsedClient } from "./importTypes";
import { getOfficialVendorMatch } from "@/constants/officialVendors";
import { syncOfficialVendorsAction } from "./vendorActions";

export async function saveImportAction(filename: string, docType: string, clients: ParsedClient[]): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const supabase = await createClient();
  
  try {
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "No estás autenticado en el sistema." };
    }

    let companyId: string;
    const { data: existingCompany } = await supabase.from('companies').select('id').limit(1);
    if (existingCompany && existingCompany.length > 0) {
      companyId = existingCompany[0].id;
    } else {
      return { success: false, error: "Compañía no encontrada en el sistema." };
    }

    await syncOfficialVendorsAction().catch(() => {});

    const startTime = Date.now();
    let totalAmount = 0;
    let totalBalance = 0;
    let totalInvoices = 0;

    clients.forEach(c => {
      totalInvoices += c.invoices.length;
      c.invoices.forEach(inv => {
        totalAmount += inv.originalAmount;
        totalBalance += inv.balanceAmount;
      });
    });

    // 2. Crear Import Job
    const { data: job, error: jobError } = await supabase.from("import_jobs").insert({
      company_id: companyId,
      user_id: user.id,
      filename: filename,
      doc_type: docType,
      status: "processing",
      total_clients: clients.length,
      total_invoices: totalInvoices,
      total_amount: totalAmount,
      total_balance: totalBalance
    }).select("id").single();

    if (jobError || !job) {
      return { success: false, error: `No se pudo inicializar la importación (Verifica haber ejecutado las migraciones SQL en Supabase): ${jobError?.message}` };
    }

    try {
      // 3. Preload all vendors in ONE query
      let { data: existingVendorsData, error: vendorErr }: { data: any[] | null; error: any } = await supabase
        .from('vendors')
        .select('id, vendor_code, brand_codes')
        .eq('company_id', companyId);

      if (vendorErr) {
        console.warn("Fallo al obtener brand_codes en importación (intentando fallback sin brand_codes):", vendorErr.message || vendorErr.details || JSON.stringify(vendorErr));
        const fb = await supabase
          .from('vendors')
          .select('id, vendor_code')
          .eq('company_id', companyId);
        existingVendorsData = fb.data ? (fb.data as any[]).map(v => ({ ...v, brand_codes: {} })) : null;
      }

      const vendorMap = new Map<string, string>();
      const vendorList: any[] = existingVendorsData || [];
      vendorList.forEach(v => {
        if (v.vendor_code) vendorMap.set(String(v.vendor_code).toUpperCase(), v.id);
      });

      const findVendorId = (code: string, brand: string): string | null => {
        if (!code) return null;
        const upperCode = String(code).trim().toUpperCase();
        const cleanCode = !isNaN(Number(upperCode)) && upperCode !== "" ? Number(upperCode).toString() : upperCode;
        const lowerBrand = (brand || '').toLowerCase();

        // 1. Check brand specific mapping in brand_codes
        for (const v of vendorList) {
          if (v.brand_codes && typeof v.brand_codes === 'object') {
            for (const [bKey, bVal] of Object.entries(v.brand_codes)) {
              if (lowerBrand.includes(bKey.toLowerCase().split('-')[0].trim()) || bKey.toLowerCase().includes(lowerBrand.split('-')[0].trim())) {
                if (Array.isArray(bVal) && bVal.some((c: any) => {
                  const upperC = String(c).trim().toUpperCase();
                  const cleanC = !isNaN(Number(upperC)) && upperC !== "" ? Number(upperC).toString() : upperC;
                  return cleanC === cleanCode || upperC === upperCode;
                })) {
                  return v.id;
                }
              }
            }
          }
        }

        const official = getOfficialVendorMatch(cleanCode, '', brand);
        if (official) {
          const matchedId = vendorMap.get(official.code.toUpperCase()) || vendorMap.get(official.code);
          if (matchedId) return matchedId;
        }

        // 2. Fallback to general code in vendorMap
        return vendorMap.get(upperCode) || vendorMap.get(cleanCode) || null;
      };

      let sinVendedorId = vendorMap.get('SIN_VENDEDOR');
      if (!sinVendedorId) {
        const { data: newV } = await supabase.from('vendors').insert({
          company_id: companyId,
          vendor_code: 'SIN_VENDEDOR',
          name: 'PENDIENTE DE ASIGNACIÓN',
          status: 'unassigned'
        }).select('id').single();
        if (newV) {
          sinVendedorId = newV.id;
          vendorMap.set('SIN_VENDEDOR', newV.id);
          vendorList.push({ id: newV.id, vendor_code: 'SIN_VENDEDOR', brand_codes: {} });
        }
      }

      // Collect and bulk insert new vendors
      const neededVendorCodes = new Set<string>();
      clients.forEach(c => c.invoices.forEach(inv => {
        if (inv.vendorCode) neededVendorCodes.add(String(inv.vendorCode).toUpperCase());
      }));

      const newVendorsToInsert: any[] = [];
      neededVendorCodes.forEach(code => {
        if (!findVendorId(code, docType) && code !== 'SIN_VENDEDOR') {
          const official = getOfficialVendorMatch(code, '', docType);
          newVendorsToInsert.push({
            company_id: companyId,
            vendor_code: official ? official.code : code,
            name: official ? official.name : ('Vendedor ' + code),
            status: official ? official.status : 'active',
            brand_codes: official ? official.brand_codes : {}
          });
        }
      });

      if (newVendorsToInsert.length > 0) {
        for (let i = 0; i < newVendorsToInsert.length; i += 100) {
          const chunk = newVendorsToInsert.slice(i, i + 100);
          const { data: insertedVendors } = await supabase.from('vendors').insert(chunk).select('id, vendor_code');
          if (insertedVendors) {
            insertedVendors.forEach(v => {
              if (v.vendor_code) vendorMap.set(String(v.vendor_code).toUpperCase(), v.id);
            });
          }
        }
      }

      // 4. Process clients & consolidate
      const { data: existingClientsData } = await supabase
        .from('clients')
        .select('id, client_code, name, dni, cuit_cuil, origin_codes, address');
      
      let existingClients = existingClientsData || [];
      
      // Track which clients need to be created vs updated
      const clientsToCreate: (ParsedClient & { _tempIndex: number })[] = [];
      const clientAssignedIds = new Map<number, string>();

      for (let idx = 0; idx < clients.length; idx++) {
        const client = clients[idx];
        let matchedClient = null;
        
        // 1. CUIT/CUIL
        if (client.cuitCuil) {
          matchedClient = existingClients.find(c => c.cuit_cuil === client.cuitCuil);
        }
        // 2. DNI
        if (!matchedClient && client.dni) {
          matchedClient = existingClients.find(c => c.dni === client.dni);
        }
        // 3. Code
        if (!matchedClient && client.code) {
          matchedClient = existingClients.find(c => {
             if (c.client_code === client.code) return true;
             if (c.origin_codes && Array.isArray(c.origin_codes)) {
                return c.origin_codes.includes(client.code);
             }
             return false;
          });
        }
        // 4. Name + Address
        if (!matchedClient) {
          matchedClient = existingClients.find(c => 
             c.name.toLowerCase() === client.name.toLowerCase() && 
             c.address?.toLowerCase() === client.address.toLowerCase()
          );
        }

        if (matchedClient) {
          const clientId = matchedClient.id;
          clientAssignedIds.set(idx, clientId);
          
          const codes = Array.isArray(matchedClient.origin_codes) ? matchedClient.origin_codes : [];
          let needsUpdate = false;
          let updatePayload: any = {};
          
          if (client.code && !codes.includes(client.code)) {
             codes.push(client.code);
             updatePayload.origin_codes = codes;
             needsUpdate = true;
          }
          if (client.dni && !matchedClient.dni) {
             updatePayload.dni = client.dni;
             needsUpdate = true;
          }
          if (client.cuitCuil && !matchedClient.cuit_cuil) {
             updatePayload.cuit_cuil = client.cuitCuil;
             needsUpdate = true;
          }
          
          if (needsUpdate) {
             await supabase.from('clients').update(updatePayload).eq('id', clientId);
             matchedClient.origin_codes = codes;
             if (updatePayload.dni) matchedClient.dni = updatePayload.dni;
             if (updatePayload.cuit_cuil) matchedClient.cuit_cuil = updatePayload.cuit_cuil;
          }
        } else {
          clientsToCreate.push({ ...client, _tempIndex: idx });
        }
      }

      // Bulk insert new clients
      if (clientsToCreate.length > 0) {
        const createPayload = clientsToCreate.map(c => ({
           company_id: companyId,
           client_code: c.code,
           name: c.name,
           dni: c.dni || null,
           cuit_cuil: c.cuitCuil || null,
           origin_codes: [c.code],
           locality: c.locality,
           address: c.address
        }));

        for (let i = 0; i < createPayload.length; i += 100) {
          const chunk = createPayload.slice(i, i + 100);
          const chunkClients = clientsToCreate.slice(i, i + 100);
          
          const { data: newClients, error: clientErr } = await supabase
             .from('clients')
             .insert(chunk)
             .select('id, client_code, name');
          
          if (clientErr) {
            throw new Error(`Error al insertar nuevos clientes en base de datos: ${clientErr.message}`);
          }
          
          if (newClients) {
            newClients.forEach((nc, ncIdx) => {
               const origClient = chunkClients[ncIdx];
               if (origClient && nc.id) {
                 clientAssignedIds.set(origClient._tempIndex, nc.id);
                 existingClients.push({
                   id: nc.id,
                   client_code: nc.client_code,
                   name: nc.name,
                   dni: origClient.dni || null,
                   cuit_cuil: origClient.cuitCuil || null,
                   origin_codes: [nc.client_code],
                   address: origClient.address
                 });
               }
            });
          }
        }
      }

      // 5. Bulk prepare & upsert Invoices
      const allInvoicesToUpsert: any[] = [];
      
      for (let idx = 0; idx < clients.length; idx++) {
         const client = clients[idx];
         const clientId = clientAssignedIds.get(idx);
         if (!clientId) continue;

         for (const inv of client.invoices) {
            const vendorCode = inv.vendorCode ? String(inv.vendorCode).toUpperCase() : '';
            const vendorId = findVendorId(vendorCode, inv.brand || '') || sinVendedorId || null;

            allInvoicesToUpsert.push({
               company_id: companyId,
               client_id: clientId,
               import_job_id: job.id,
               origin_brand: inv.brand || 'S/M',
               vendor_id: vendorId,
               invoice_number: inv.invoiceNumber,
               invoice_type: inv.invoiceType || 'Factura',
               issue_date: inv.issueDate || null,
               due_date: inv.dueDate || null,
               original_amount: inv.originalAmount,
               balance_amount: inv.balanceAmount,
               observations: inv.observations || null,
               internal_code: inv.internalCode || null,
               internal_indicator: inv.internalIndicator || null,
               is_active: true,
               updated_at: new Date().toISOString()
            });
         }
      }

      // Upsert in chunks of 200
      for (let i = 0; i < allInvoicesToUpsert.length; i += 200) {
         const chunk = allInvoicesToUpsert.slice(i, i + 200);
         const { error: invErr } = await supabase.from('invoices').upsert(chunk, {
            onConflict: 'company_id,client_id,invoice_number,origin_brand'
         });
         if (invErr) {
            throw new Error(`Error al guardar facturas (Verifica haber ejecutado el SQL en Supabase para tener la columna origin_brand y el índice único): ${invErr.message}`);
         }
      }

      const durationMs = Date.now() - startTime;
      await supabase.from("import_jobs").update({ 
        status: "completed",
        processing_time_ms: durationMs,
        completed_at: new Date().toISOString()
      }).eq("id", job.id);

      return { success: true, jobId: job.id };

    } catch (error: any) {
      await supabase.from("import_jobs").update({ 
         status: "failed", 
         errors: [{ message: error?.message || String(error) }] 
      }).eq("id", job.id);
      return { success: false, error: error?.message || String(error) };
    }
  } catch (outerError: any) {
    console.error("Fatal save import error:", outerError);
    return { success: false, error: outerError?.message || String(outerError) };
  }
}
