"use server";

import { createClient } from "@/utils/supabase/server";
import type { ParsedClient } from "./parsePdf";

export async function saveImportAction(filename: string, clients: ParsedClient[]) {
  const supabase = await createClient();
  
  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("No estás autenticado.");
  }

  let companyId: string;
  const { data: existingCompany } = await supabase.from('companies').select('id').limit(1);
  
  if (existingCompany && existingCompany.length > 0) {
    companyId = existingCompany[0].id;
  } else {
    const { data: newCompany, error: compErr } = await supabase.from('companies').insert({ name: 'VentaCore Demo Tenant' }).select('id');
    if (compErr || !newCompany) throw new Error("Error creando compañía: " + (compErr?.message || "Desconocido"));
    companyId = newCompany[0].id;
  }

  // Ensure user exists in public.users to satisfy foreign key in import_jobs
  const { data: existingUser } = await supabase.from('users').select('id').eq('id', user.id).limit(1);
  if (!existingUser || existingUser.length === 0) {
     const { error: userErr } = await supabase.from('users').insert({
       id: user.id,
       company_id: companyId,
       email: user.email,
       full_name: 'Administrador Demo',
       role: 'admin'
     });
     if (userErr) throw new Error("Error registrando usuario interno: " + userErr.message);
  }

  // Flatten the invoices to count total records
  const totalInvoices = clients.reduce((acc, c) => acc + c.invoices.length, 0);

  // 2. Crear Import Job
  const { data: job, error: jobError } = await supabase.from("import_jobs").insert({
    company_id: companyId,
    user_id: user.id,
    filename: filename,
    status: "processing",
    total_records: totalInvoices
  }).select("id").single();

  if (jobError || !job) {
    console.error("Job Error", jobError);
    throw new Error("No se pudo inicializar la importación.");
  }

  // 3. Preparar los registros para Staging
  const stagingData = clients.flatMap(client => 
    client.invoices.map(inv => ({
      import_job_id: job.id,
      company_id: companyId,
      raw_brand: inv.brand,
      raw_vendor_code: inv.vendorCode,
      raw_client_code: client.code,
      raw_client_name: client.name,
      raw_client_identifier: client.identifier,
      raw_client_locality: client.locality,
      raw_client_address: client.address,
      raw_invoice_number: inv.invoiceNumber,
      raw_issue_date: inv.issueDate,
      raw_due_date: inv.dueDate, 
      // Replace commas with dots for numeric parsing in Postgres
      raw_original_amount: parseFloat(inv.originalAmount.replace('.', '').replace(',', '.')),
      raw_balance_amount: parseFloat(inv.balanceAmount.replace('.', '').replace(',', '.')),
      processing_status: 'valid',
      action_required: 'insert'
    }))
  );

  // Fix date formats
  const sanitizeDate = (dateStr: string) => {
    if (!dateStr) return dateStr;
    // If it's DD/MM/YY, convert to YYYY-MM-DD
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000;
      return `${year}-${parts[1]}-${parts[0]}`;
    }
    // If it's DDMMYY (length 6, no slashes), convert to YYYY-MM-DD
    if (dateStr.length === 6 && !dateStr.includes("/")) {
       const d = dateStr.substring(0, 2);
       const m = dateStr.substring(2, 4);
       let y = parseInt(dateStr.substring(4, 6));
       if (y < 100) y += 2000;
       return `${y}-${m}-${d}`;
    }
    return dateStr;
  };

  const cleanStagingData = stagingData.map(d => ({
    ...d,
    raw_issue_date: sanitizeDate(d.raw_issue_date),
    raw_due_date: sanitizeDate(d.raw_due_date)
  }));

  // 4. Insertar masivamente en staging_records
  const { error: stagingError } = await supabase.from("staging_records").insert(cleanStagingData);

  if (stagingError) {
    console.error("Staging Error", stagingError);
    // Cambiar estado a fallido
    await supabase.from("import_jobs").update({ status: "failed" }).eq("id", job.id);
    throw new Error("No se pudieron insertar los registros de staging.");
  }

  // 5. Ejecutar la Función RPC que comitea de staging a las tablas reales
  const { error: rpcError } = await supabase.rpc("commit_import_job", {
    job_id: job.id
  });

  if (rpcError) {
    console.error("RPC Error", rpcError);
    await supabase.from("import_jobs").update({ status: "failed" }).eq("id", job.id);
    throw new Error("Fallo en la consolidación del motor (commit_import_job).");
  }

  return { success: true, jobId: job.id };
}
