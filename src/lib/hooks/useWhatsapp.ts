"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

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
    onError: (error) => toast.error(error.message),
  });

  return {
    hiloDe: trpc.whatsapp.hiloDe.useQuery,
    enviarMensaje,
  };
}
