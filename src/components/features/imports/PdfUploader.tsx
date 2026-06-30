"use client";

import React, { useState, useTransition } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { parsePdfAction, ParsedClient } from "@/actions/parsePdf";
import { saveImportAction } from "@/actions/saveImport";

export default function PdfUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, startParsing] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [result, setResult] = useState<ParsedClient[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setError(null);
    } else {
      setError("Por favor, selecciona un archivo PDF válido.");
    }
  };

  const handleUpload = () => {
    if (!file) return;
    
    startParsing(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const data = await parsePdfAction(formData);
        
        if (data.error) {
           setError(data.error);
           setResult(null);
        } else if (data.success && data.clients) {
           setResult(data.clients);
           setError(null);
        }
      } catch (err: any) {
        setError(err.message || "Error al procesar el PDF");
      }
    });
  };

  const handleConfirm = () => {
     if (!result || !file) return;

     startSaving(async () => {
        try {
           const res = await saveImportAction(file.name, result);
           if (res.success) {
              alert("¡Importación exitosa! Todos los datos se sincronizaron con la base de datos.");
              setResult(null);
              setFile(null);
           }
        } catch(err: any) {
           setError(err.message || "Error al guardar en la base de datos.");
        }
     });
  };

  return (
    <div className="w-full">
      <div className="border-2 border-dashed border-slate-700 rounded-xl p-10 bg-slate-900/50 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Sincronizador L'ORCLE / ONWELL
        </h3>
        <p className="text-sm text-slate-400 mb-6 max-w-sm">
          Sube el reporte PDF extraído del ERP para sincronizar la deuda y actualizar la base de clientes.
        </p>
        
        <input 
          type="file" 
          id="pdf-upload" 
          accept=".pdf" 
          className="hidden" 
          onChange={handleFileChange}
        />
        <label 
          htmlFor="pdf-upload" 
          className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Seleccionar Archivo
        </label>

        {file && (
          <div className="mt-6 flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 w-full max-w-md">
            <FileText className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-slate-300 truncate flex-1 text-left">{file.name}</span>
            <button 
              onClick={handleUpload}
              disabled={isParsing}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extraer"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 bg-red-950/50 border border-red-900 text-red-400 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {result && !error && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Vista Previa de Extracción
            </h3>
            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
              {result.length} clientes extraídos
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
             <div className="max-h-[500px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/50 sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-400">Código</th>
                      <th className="px-4 py-3 font-medium text-slate-400">Cliente</th>
                      <th className="px-4 py-3 font-medium text-slate-400">Identificador</th>
                      <th className="px-4 py-3 font-medium text-slate-400">Facturas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {result.slice(0, 100).map((c, i) => (
                      <tr key={i} className="hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-emerald-400 font-mono">{c.code}</td>
                        <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                        <td className="px-4 py-3 text-slate-400">{c.identifier}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {c.invoices.length} comprobantes detectados
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             {result.length > 100 && (
               <div className="p-3 text-center text-sm text-slate-500 bg-slate-950/50 border-t border-slate-800">
                  Mostrando los primeros 100 clientes... (Total: {result.length})
               </div>
             )}
          </div>
          <div className="flex justify-end pt-4">
             <button 
                onClick={handleConfirm}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-white px-6 py-2.5 rounded-md font-medium inline-flex items-center gap-2 shadow-lg"
             >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {isSaving ? "Guardando en Supabase..." : `Confirmar e Importar DB Oficial`}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
