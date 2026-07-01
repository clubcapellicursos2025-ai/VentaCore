"use server";

import { createClient } from "@/utils/supabase/server";

export async function clearDatabaseAction() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No estás autenticado.");

  const { data: existingCompany } = await supabase.from('companies').select('id').limit(1);
  if (!existingCompany || existingCompany.length === 0) {
    throw new Error("Compañía no encontrada");
  }
  const companyId = existingCompany[0].id;

  // Delete all import history
  // Since we have ON DELETE CASCADE for most things, this should clean up staging_records
  await supabase.from("import_jobs").delete().eq("company_id", companyId);

  // Delete invoices, clients, vendors
  await supabase.from("invoices").delete().eq("company_id", companyId);
  await supabase.from("clients").delete().eq("company_id", companyId);
  await supabase.from("vendors").delete().eq("company_id", companyId);

  return { success: true };
}

export async function deleteImportAction(jobId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No estás autenticado.");

  const { data: job } = await supabase.from("import_jobs").select("id").eq("id", jobId).single();
  if (!job) throw new Error("Importación no encontrada");

  // This will cascade and delete staging records, but what about invoices?
  // We added import_job_id to invoices ON DELETE SET NULL, but if we delete the import, we probably want to delete the invoices that came from it.
  await supabase.from("invoices").delete().eq("import_job_id", jobId);
  await supabase.from("import_jobs").delete().eq("id", jobId);

  return { success: true };
}
