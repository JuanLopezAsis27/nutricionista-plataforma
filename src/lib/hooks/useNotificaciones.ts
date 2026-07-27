"use client";

import { trpc } from "@/lib/trpc";

/**
 * Encapsula el Centro de Notificaciones del nutricionista: un único feed con
 * alertas de seguimiento, mensajes de pacientes sin leer y avisos de correo.
 * Se refresca en tiempo real (ver useTiempoReal, que invalida esta query).
 */
export function useNotificaciones() {
  return {
    centro: trpc.notificaciones.centro.useQuery,
  };
}
