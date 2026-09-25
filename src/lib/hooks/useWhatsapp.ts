"use client";

import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";
import { avisarError } from "@/lib/errores";

/**
 * Encapsula las llamadas tRPC del CHAT de WhatsApp con un paciente.
 *
 * Los recordatorios de turno tienen su propio hook (`useRecordatorios`): son
 * otra tarea, con otra pantalla y otro ciclo de vida.
 */
export function useWhatsapp() {
  const invalidar = useInvalidar();

  const enviarMensaje = trpc.whatsapp.enviarMensaje.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => avisarError(error),
  });

  const enviarPlantilla = trpc.whatsapp.enviarPlantilla.useMutation({
    onSuccess: () => invalidar(),
    onError: (error) => avisarError(error),
  });

  // Sin toast de error: marcar leído es un efecto de abrir el chat, y si falla
  // lo único que pasa es que el número sigue un rato más.
  const marcarLeidos = trpc.whatsapp.marcarLeidos.useMutation({
    onSuccess: () => invalidar(),
  });

  return {
    hiloDe: trpc.whatsapp.hiloDe.useQuery,
    marcarLeidos,
    enviarMensaje,
    enviarPlantilla,
  };
}
