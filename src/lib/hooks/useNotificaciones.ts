"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

/**
 * Encapsula el Centro de Notificaciones del nutricionista: un único feed con
 * alertas de seguimiento, mensajes de pacientes sin leer, avisos de correo y
 * las notificaciones persistidas (WhatsApp entrante, turnos confirmados).
 * Se refresca en tiempo real (ver useTiempoReal, que invalida esta query).
 */
export function useNotificaciones() {
  const utils = trpc.useUtils();

  /**
   * Marca vista una notificación, o todas si va sin id.
   *
   * Invalida SOLO el centro y no todo (`useInvalidar`): marcar algo como visto
   * no cambia ningún otro dato de la pantalla, y un refetch general por cada
   * ítem que se lee sería mucho ruido para nada.
   */
  const marcarVista = trpc.notificaciones.marcarVista.useMutation({
    onSuccess: () => void utils.notificaciones.centro.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  return {
    centro: trpc.notificaciones.centro.useQuery,
    marcarVista,
  };
}
