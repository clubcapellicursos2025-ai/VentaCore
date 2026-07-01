"use client";

import React, { useState, useTransition } from "react";
import { Trash, Loader2 } from "lucide-react";
import { deleteImportAction } from "@/actions/clearDatabase";
import ConfirmModal from "@/components/common/ConfirmModal";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import AlertModal from "@/components/common/AlertModal";

export default function DeleteImportButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; msg: string }>({ isOpen: false, msg: "" });

  const executeDelete = () => {
    setShowConfirm(false);
    startTransition(async () => {
      try {
        await deleteImportAction(jobId);
        window.location.reload();
      } catch (error: any) {
        setErrorModal({ isOpen: true, msg: error?.message || "Ocurrió un error al eliminar los datos." });
      }
    });
  };

  return (
    <>
      <ConfirmModal
        isOpen={showConfirm}
        title="¿Eliminar Importación y Facturas?"
        message="Se eliminará este registro del historial y todas las facturas y saldos que fueron importados con este archivo en la base de datos consolidada."
        warningText="Esta acción no se puede deshacer y los saldos de los clientes afectados se recalcularán automáticamente."
        confirmText="Sí, Eliminar Todo"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setShowConfirm(false)}
        isPending={isPending}
      />

      <LoadingOverlay
        isOpen={isPending}
        step="deleting"
        title="Eliminando Registros..."
        message="Desvinculando facturas y eliminando el archivo del historial consolidado en Supabase..."
      />

      <AlertModal
        isOpen={errorModal.isOpen}
        type="error"
        title="No se pudo eliminar"
        message="Ocurrió un problema al intentar borrar la importación del servidor."
        details={errorModal.msg}
        onClose={() => setErrorModal({ isOpen: false, msg: "" })}
      />

      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
        title="Eliminar esta importación y sus facturas"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Trash className="w-4 h-4" />}
      </button>
    </>
  );
}
