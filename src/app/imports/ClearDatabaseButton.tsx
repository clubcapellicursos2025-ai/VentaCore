"use client";

import React, { useState, useTransition } from "react";
import { Trash2, Loader2, AlertOctagon } from "lucide-react";
import { clearDatabaseAction } from "@/actions/clearDatabase";
import ConfirmModal from "@/components/common/ConfirmModal";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import AlertModal from "@/components/common/AlertModal";

export default function ClearDatabaseButton() {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    msg: string;
    onClose?: () => void;
  }>({ isOpen: false, type: "success", title: "", msg: "" });

  const executeClear = () => {
    setShowConfirm(false);
    startTransition(async () => {
      try {
        await clearDatabaseAction();
        setModalState({
          isOpen: true,
          type: "success",
          title: "¡Base de Datos Limpiada!",
          msg: "Se han vaciado correctamente todos los clientes, facturas e historiales de importación.",
          onClose: () => {
            setModalState(prev => ({ ...prev, isOpen: false }));
            window.location.reload();
          },
        });
      } catch (error: any) {
        setModalState({
          isOpen: true,
          type: "error",
          title: "Error al limpiar base de datos",
          msg: error?.message || "Ocurrió un error inesperado al intentar vaciar las tablas en el servidor.",
          onClose: () => setModalState(prev => ({ ...prev, isOpen: false })),
        });
      }
    });
  };

  return (
    <>
      <ConfirmModal
        isOpen={showConfirm}
        title="⚠️ ¿VACIAR BASE DE DATOS COMPLETA?"
        message="Esta operación eliminará de forma definitiva TODOS los clientes, facturas, comprobantes, saldos pendientes y el historial de importaciones del sistema."
        warningText="ACCIÓN DESTRUCTIVA E IRREVERSIBLE: La base de datos de cuentas corrientes quedará en cero como la primera vez."
        confirmText="Sí, Vaciar Todo el Sistema"
        cancelText="Cancelar y Volver"
        variant="danger"
        onConfirm={executeClear}
        onCancel={() => setShowConfirm(false)}
        isPending={isPending}
      />

      <LoadingOverlay
        isOpen={isPending}
        step="deleting"
        title="Vacíanzo Base de Datos..."
        message="Eliminando en cascada todos los registros financieros, clientes e historiales de Supabase..."
      />

      <AlertModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.msg}
        onClose={modalState.onClose || (() => setModalState(prev => ({ ...prev, isOpen: false })))}
      />

      <button
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="bg-gradient-to-r from-rose-600/20 to-red-600/20 hover:from-rose-600 hover:to-red-600 text-rose-400 hover:text-white border border-rose-500/30 hover:border-rose-500 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-rose-500/20 flex items-center gap-2 transform active:scale-95"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <AlertOctagon className="w-4 h-4 text-rose-400" />}
        <span>Limpiar Base de Datos</span>
      </button>
    </>
  );
}
