"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Encapsula las llamadas tRPC del recordatorio por WhatsApp.
 *
 * Invalida turnos porque el estado del recordatorio viaja embebido en el DTO
 * de turno (es lo que pinta el color del botón en la grilla).
 */
export function useWhatsapp() {
  const utils = trpc.useUtils();
  const invalidar = () => {
    utils.turnos.invalidate();
  };

  const preparar = trpc.whatsapp.prepararRecordatorio.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => toast.error(error.message),
  });

  const enviarMensaje = trpc.whatsapp.enviarMensaje.useMutation({
    onSuccess: () => utils.whatsapp.hiloDe.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  const confirmar = trpc.whatsapp.confirmarRecordatorio.useMutation({
    onSuccess: (recordatorio) => {
      toast.success(
        recordatorio.estado === "CONFIRMADO"
          ? "Recordatorio marcado como enviado."
          : "Recordatorio descartado.",
      );
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    vistaPrevia: trpc.whatsapp.vistaPreviaRecordatorio.useQuery,
    hiloDe: trpc.whatsapp.hiloDe.useQuery,
    preparar,
    confirmar,
    enviarMensaje,
  };
}
