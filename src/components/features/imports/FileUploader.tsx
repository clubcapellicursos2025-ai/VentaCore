"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Sparkles, FileText, Eye, ArrowRight } from "lucide-react";
import { parseExcelAction } from "@/actions/parseExcel";
import { parsePdfAction } from "@/actions/parsePdf";
import { parseTxtAction } from "@/actions/parseTxt";
import type { ParsedClient, ParseResult } from "@/actions/importTypes";
import { saveImportAction } from "@/actions/saveImport";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import AlertModal from "@/components/common/AlertModal";
import ImportPreviewModal from "./ImportPreviewModal";

export default function FileUploader() {
  const [importMode, setImportMode] = useState<"PDF_EXCEL" | "TXT">("PDF_EXCEL");
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, startParsing] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Alert Modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
    details?: string;
    onClose?: () => void;
  }>({ isOpen: false, type: "info", title: "", message: "" });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    
    let p = 10;
    setProgress(p);
    const interval = setInterval(() => {
      p = Math.min(90, p + Math.floor(Math.random() * 15) + 5);
      setProgress(p);
    }, 300);

    startParsing(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        let data: ParseResult;
        if (importMode === "TXT") {
          data = await parseTxtAction(formData);
        } else {
          const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
          data = isPdf ? await parsePdfAction(formData) : await parseExcelAction(formData);
        }
        
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => setProgress(undefined), 500);

        if (data.error) {
           setError(data.error);
           setResult(null);
           setModalState({
             isOpen: true,
             type: "error",
             title: "No se pudo analizar el archivo",
             message: "El archivo no cumple con el formato esperado o tiene datos ilegibles.",
             details: data.error,
             onClose: () => setModalState(prev => ({ ...prev, isOpen: false })),
           });
        } else if (data.success && data.clients) {
           setResult(data);
           setError(null);
           setIsPreviewOpen(true);
        }
      } catch (err: any) {
        clearInterval(interval);
        setProgress(undefined);
        const errMsg = err?.message || "Error al procesar el archivo";
        setError(errMsg);
        setModalState({
          isOpen: true,
          type: "error",
          title: "Error de Lectura",
          message: "Ocurrió un error al procesar el reporte en el servidor.",
          details: errMsg,
          onClose: () => setModalState(prev => ({ ...prev, isOpen: false })),
        });
      }
    });
  };

  const handleConfirm = () => {
     if (!result || !result.clients || !file) return;
     const clientsCount = result.clients.length;
     const clientsToSave = result.clients;

     let p = 5;
     setProgress(p);
     const interval = setInterval(() => {
       p = Math.min(95, p + Math.floor(Math.random() * 10) + 3);
       setProgress(p);
     }, 200);

     startSaving(async () => {
        try {
           const formatType = importMode === "TXT" 
             ? "TXT/CSV" 
             : (file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "Excel");

           const res = await saveImportAction(file.name, formatType, clientsToSave);
           clearInterval(interval);
           setProgress(100);
           setTimeout(() => setProgress(undefined), 400);

           if (res.success) {
              setIsPreviewOpen(false);
              setResult(null);
              setFile(null);
              setModalState({
                isOpen: true,
                type: "success",
                title: "¡Importación Consolidada con Éxito!",
                message: `Se sincronizaron y unificaron ${clientsCount} clientes con sus respectivas facturas y saldos pendientes en la base de datos oficial.`,
                onClose: () => {
                  setModalState(prev => ({ ...prev, isOpen: false }));
                  window.location.reload(); // reload to show history
                },
              });
           } else {
              const errTxt = res.error || "Error desconocido al intentar guardar en la base de datos.";
              setError(errTxt);
              setModalState({
                isOpen: true,
                type: "error",
                title: "Error al Guardar en Base de Datos",
                message: "No se pudieron registrar los datos consolidados en Supabase.",
                details: errTxt,
                onClose: () => setModalState(prev => ({ ...prev, isOpen: false })),
              });
           }
        } catch(err: any) {
           clearInterval(interval);
           setProgress(undefined);
           const errTxt = err?.message || String(err) || "Error al guardar en la base de datos.";
           setError(errTxt);
           setModalState({
             isOpen: true,
             type: "error",
             title: "Error del Servidor",
             message: "Se produjo una excepción durante el procesamiento por lotes.",
             details: errTxt,
             onClose: () => setModalState(prev => ({ ...prev, isOpen: false })),
           });
        }
     });
  };

  return (
    <div className="w-full">
      {/* Fullscreen Loading Overlays */}
      <LoadingOverlay
        isOpen={isParsing}
        step="analyzing"
        progress={progress}
        title="Analizando Reporte con IA..."
        message={`Extrayendo e identificando comprobantes, saldos y clientes de ${file?.name || "archivo"}...`}
      />
      <LoadingOverlay
        isOpen={isSaving}
        step="saving"
        progress={progress}
        title="Consolidando en Base de Datos..."
        message={`Procesando en lotes de alta velocidad los ${result?.clients?.length || 0} clientes y sus comprobantes pendientes...`}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        details={modalState.details}
        onClose={modalState.onClose || (() => setModalState(prev => ({ ...prev, isOpen: false })))}
      />

      {/* Import Preview Modal */}
      <ImportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirm={handleConfirm}
        isSaving={isSaving}
        result={result}
        fileName={file?.name}
      />

      {/* Botones de Selección de Modo de Importación */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          type="button"
          onClick={() => { setImportMode("PDF_EXCEL"); setFile(null); setResult(null); setError(null); }}
          className={`flex-1 py-3.5 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all border shadow-lg ${
            importMode === "PDF_EXCEL"
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400/40 shadow-blue-500/20 scale-[1.01]"
              : "bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Importar por PDF / Excel</span>
          {importMode === "PDF_EXCEL" && <span className="ml-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
        </button>

        <button
          type="button"
          onClick={() => { setImportMode("TXT"); setFile(null); setResult(null); setError(null); }}
          className={`flex-1 py-3.5 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all border shadow-lg ${
            importMode === "TXT"
              ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-400/40 shadow-amber-500/20 scale-[1.01]"
              : "bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Importar por Archivo TXT</span>
          {importMode === "TXT" && <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
        </button>
      </div>

      <div className={`border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center text-center shadow-xl ${
        importMode === "PDF_EXCEL"
          ? "border-slate-700/80 bg-gradient-to-b from-slate-900/80 to-slate-950/80 hover:border-blue-500/50"
          : "border-amber-700/50 bg-gradient-to-b from-slate-900/90 to-amber-950/20 hover:border-amber-500/60"
      }`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner border ${
          importMode === "PDF_EXCEL"
            ? "bg-gradient-to-tr from-blue-600/20 to-cyan-500/20 border-blue-500/30 text-blue-400"
            : "bg-gradient-to-tr from-amber-600/20 to-orange-500/20 border-amber-500/30 text-amber-400"
        }`}>
          {importMode === "PDF_EXCEL" ? (
            <Upload className="w-8 h-8 animate-bounce" style={{ animationDuration: "3s" }} />
          ) : (
            <FileText className="w-8 h-8 animate-bounce" style={{ animationDuration: "3s" }} />
          )}
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <span>{importMode === "PDF_EXCEL" ? "Importador PDF / Excel (3 Marcas)" : "Importador de Archivos TXT (3 Marcas)"}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-normal border ${
            importMode === "PDF_EXCEL" 
              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}>
            {importMode === "PDF_EXCEL" ? "PDF / Excel" : "Texto Plano / Delimitado"}
          </span>
        </h3>
        
        <p className="text-sm text-slate-400 mb-6 max-w-md leading-relaxed">
          {importMode === "PDF_EXCEL" ? (
            <>Sube los reportes de <strong className="text-slate-200">L'Oréal, Key Full o Wella</strong> en formato <strong className="text-slate-200">Excel (.xlsx, .xls) o PDF</strong>. El sistema identificará la marca y sincronizará la deuda.</>
          ) : (
            <>Sube los reportes en formato de texto plano <strong className="text-slate-200">(.txt, .csv, .tsv)</strong> de cualquiera de las 3 marcas. El motor IA estructurará las columnas y códigos.</>
          )}
        </p>
        
        <input 
          type="file" 
          id="file-upload" 
          accept={importMode === "PDF_EXCEL" ? ".xlsx, .xls, .pdf" : ".txt, .csv, .tsv"} 
          className="hidden" 
          onChange={handleFileChange}
        />
        <label 
          htmlFor="file-upload" 
          className={`cursor-pointer text-white px-8 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all transform active:scale-95 inline-flex items-center gap-2 ${
            importMode === "PDF_EXCEL"
              ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-blue-500/20"
              : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/20"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {importMode === "PDF_EXCEL" ? "Seleccionar Reporte PDF / Excel" : "Seleccionar Archivo TXT"}
        </label>

        {file && (
          <div className="mt-6 flex items-center gap-3 bg-slate-900/90 p-3.5 rounded-xl border border-slate-700/80 w-full max-w-md shadow-lg animate-fadeIn">
            <div className={`p-2 rounded-lg ${importMode === "PDF_EXCEL" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>
              {importMode === "PDF_EXCEL" ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <span className="text-sm font-medium text-slate-200 truncate flex-1 text-left">{file.name}</span>
            <button 
              onClick={handleUpload}
              disabled={isParsing}
              className={`text-white px-5 py-2 rounded-lg text-sm font-semibold shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                importMode === "PDF_EXCEL"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                  : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
              }`}
            >
              {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analizar con IA"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 bg-rose-950/40 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-start gap-3 shadow-lg animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {result && result.clients && !error && (
        <div className="mt-8 bg-gradient-to-r from-slate-900 to-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <h3 className="text-xl font-bold text-white">Reporte Procesado y Validado</h3>
              </div>
              <p className="text-xs text-slate-400">
                Se detectaron y estructuraron correctamente los saldos del reporte.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-cyan-400 bg-cyan-500/10 px-3.5 py-1.5 rounded-xl border border-cyan-500/20 font-mono text-xs font-bold">
                {result.brandDetected}
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/20 shadow-inner">
                {result.clients.length} clientes listos
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
             <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-6 py-3.5 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
             >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Ver Pre-visualización, Duplicados y Excepciones</span>
             </button>

             <button 
                type="button"
                onClick={handleConfirm}
                disabled={isSaving}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all text-white px-8 py-3.5 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/20 transform active:scale-95"
             >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isSaving ? "Consolidando en Base de Datos..." : `Confirmar e Importar DB Oficial`}</span>
                {!isSaving && <ArrowRight className="w-4 h-4 ml-0.5" />}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
