"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { avisarError } from "@/lib/errores";

/** Llamadas tRPC de la IA de la plataforma (panel del SUPERADMIN). */
export function useIAPlataforma() {
  const utils = trpc.useUtils();
  // El saldo y el estado dependen de las claves: se refrescan juntos.
  const invalidar = () => void utils.superadmin.invalidate();

  const guardar = trpc.superadmin.guardarIA.useMutation({
    onSuccess: () => {
      toast.success("Configuración de IA guardada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  const eliminarClave = trpc.superadmin.eliminarClaveIA.useMutation({
    onSuccess: () => {
      toast.success("Clave eliminada.");
      invalidar();
    },
    onError: (error) => avisarError(error),
  });

  return {
    estado: trpc.superadmin.estadoIA.useQuery,
    saldos: trpc.superadmin.saldosIA.useQuery,
    resumen: trpc.superadmin.resumenUsoIA.useQuery,
    registros: trpc.superadmin.registrosUsoIA.useQuery,
    guardar,
    eliminarClave,
  };
}
