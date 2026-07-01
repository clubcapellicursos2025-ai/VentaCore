"use client";

import React, { useState, useTransition } from "react";
import { MessageSquare, Plus, Send, Trash2, Clock, User, CheckCircle2, AlertCircle, PhoneCall, Tag } from "lucide-react";
import { ClientNote, addClientNoteAction, deleteClientNoteAction } from "@/actions/noteActions";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ClientNotesProps {
  clientId: string;
  initialNotes: ClientNote[];
}

export function ClientNotes({ clientId, initialNotes }: ClientNotesProps) {
  const [notes, setNotes] = useState<ClientNote[]>(initialNotes);
  const [newContent, setNewContent] = useState("");
  const [noteType, setNoteType] = useState("cobranza");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setErrorMsg(null);
    const content = newContent.trim();
    const type = noteType;

    startTransition(async () => {
      try {
        await addClientNoteAction(clientId, content, type);
        // Optimistic update
        const newNote: ClientNote = {
          id: "temp-" + Date.now(),
          client_id: clientId,
          user_name: "Tú (Ahora)",
          content: content,
          note_type: type,
          created_at: new Date().toISOString()
        };
        setNotes(prev => [newNote, ...prev]);
        setNewContent("");
      } catch (err: any) {
        setErrorMsg(err.message || "No se pudo guardar la nota.");
      }
    });
  };

  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      try {
        await deleteClientNoteAction(noteId, clientId);
        setNotes(prev => prev.filter(n => n.id !== noteId));
      } catch (err: any) {
        setErrorMsg(err.message || "Error al eliminar");
      }
    });
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "compromiso":
        return { label: "Compromiso de Pago", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 };
      case "reclamo":
        return { label: "Reclamo / Disputa", bg: "bg-rose-500/10 text-rose-400 border-rose-500/20", icon: AlertCircle };
      case "cobranza":
        return { label: "Gestión de Cobranza", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: PhoneCall };
      default:
        return { label: "Observación General", bg: "bg-slate-500/10 text-slate-300 border-slate-500/20", icon: Tag };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Bitácora Comercial y Cobranzas</h3>
            <p className="text-xs text-slate-400">Historial de gestiones, llamadas, acuerdos y promesas de pago del cliente</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-semibold">
          {notes.length} {notes.length === 1 ? "registro" : "registros"}
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario para nueva nota */}
      <form onSubmit={handleAddNote} className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Tipo de gestión:</span>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="cobranza">📞 Gestión de Cobranza</option>
              <option value="compromiso">🤝 Compromiso de Pago</option>
              <option value="reclamo">⚠️ Reclamo / Descuento</option>
              <option value="general">📌 Observación General</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Ej: Se comunicó telefónicamente con el cliente. Prometió cancelar la factura vencida el próximo martes mediante transferencia bancaria..."
            rows={2}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={isPending || !newContent.trim()}
            className="px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-1 shrink-0 min-w-[90px]"
          >
            <Send className="w-4 h-4" />
            <span>{isPending ? "..." : "Registrar"}</span>
          </button>
        </div>
      </form>

      {/* Lista de Notas */}
      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">No hay gestiones ni notas registradas</p>
            <p className="text-xs text-slate-600 mt-0.5">Escribe arriba para registrar el primer contacto o acuerdo con este cliente.</p>
          </div>
        ) : (
          notes.map((note) => {
            const badge = getTypeBadge(note.note_type);
            const Icon = badge.icon;
            let timeStr = "Hace un momento";
            try {
              timeStr = formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: es });
            } catch {}

            return (
              <div
                key={note.id}
                className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-all group flex items-start justify-between gap-4 animate-fadeIn"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1 ${badge.bg}`}>
                      <Icon className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {note.user_name}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeStr}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans break-words">
                    {note.content}
                  </p>
                </div>

                {!note.id.startsWith("obs-") && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={isPending}
                    title="Eliminar registro"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
