"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface ClientNote {
  id: string;
  client_id: string;
  user_name: string;
  content: string;
  note_type: string;
  created_at: string;
}

export async function getClientNotes(clientId: string): Promise<ClientNote[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("client_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    // Si la tabla no existe, intentamos leer la columna observations en clients como fallback
    const { data: clientData } = await supabase
      .from("clients")
      .select("observations, notes")
      .eq("id", clientId)
      .single();

    const notesList: ClientNote[] = [];
    if (clientData?.observations) {
      notesList.push({
        id: "obs-1",
        client_id: clientId,
        user_name: "Sistema / Importación",
        content: clientData.observations,
        note_type: "general",
        created_at: new Date().toISOString()
      });
    }
    if (clientData?.notes && clientData.notes !== clientData.observations) {
      notesList.push({
        id: "obs-2",
        client_id: clientId,
        user_name: "Bitácora",
        content: clientData.notes,
        note_type: "cobranza",
        created_at: new Date().toISOString()
      });
    }
    return notesList;
  }

  return (data || []) as ClientNote[];
}

export async function addClientNoteAction(clientId: string, content: string, noteType: string = "cobranza") {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let userName = "Asesor Comercial";
  if (user?.email) {
    userName = user.email.split("@")[0];
  }

  // Obtener company_id
  let companyId: string | null = null;
  const { data: comp } = await supabase.from("companies").select("id").limit(1);
  if (comp && comp.length > 0) {
    companyId = comp[0].id;
  }

  const payload = {
    company_id: companyId,
    client_id: clientId,
    user_name: userName,
    content: content.trim(),
    note_type: noteType
  };

  const { error } = await supabase.from("client_notes").insert(payload);

  if (error) {
    // Si falla por tabla inexistente (PGRST204 o 42P01), guardamos en la columna observations o notes en clients
    if (error.code === "42P01" || error.code === "PGRST204" || error.message.includes("client_notes")) {
      const { data: curr } = await supabase.from("clients").select("notes, observations").eq("id", clientId).single();
      const existing = curr?.notes || curr?.observations || "";
      const newText = `[${new Date().toLocaleDateString("es-AR")} - ${userName} (${noteType.toUpperCase()})]: ${content}\n${existing}`;
      
      const { error: updErr } = await supabase.from("clients").update({ notes: newText, observations: newText }).eq("id", clientId);
      if (updErr) {
        throw new Error(`Nota: Para activar la bitácora completa, ejecuta en Supabase SQL: CREATE TABLE IF NOT EXISTS client_notes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), company_id UUID, client_id UUID, user_name TEXT, content TEXT, note_type TEXT, created_at TIMESTAMPTZ DEFAULT NOW());`);
      }
    } else {
      throw new Error(error.message);
    }
  }

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function deleteClientNoteAction(noteId: string, clientId: string) {
  const supabase = await createClient();
  
  if (noteId.startsWith("obs-")) {
    return { success: true };
  }

  const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
