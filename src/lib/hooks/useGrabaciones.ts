"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useInvalidar } from "@/lib/hooks/useInvalidar";

/**
 * Cada cuánto se relee mientras hay una transcripción en curso.
 *
 * Se refresca por sondeo y no por el bus de tiempo real a propósito: la
 * transcripción la hace el WORKER, que es otro proceso, y publicar en el bus
 * desde ahí sumaría un camino de notificación entre procesos para una espera
 * de un par de minutos que además ya está acotada. Cuando no hay nada
 * procesándose el sondeo se apaga solo (ver `refetchInterval` abajo).
 */
const INTERVALO_SONDEO_MS = 8000;

/** Encapsula las llamadas tRPC de las grabaciones de consulta. */
export function useGrabaciones() {
  const invalidar = useInvalidar();

  const registrar = trpc.grabaciones.registrar.useMutation({
    onSuccess: () => {
      toast.success("Grabación guardada. Se está transcribiendo…");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const eliminar = trpc.grabaciones.eliminar.useMutation({
    onSuccess: () => {
      toast.success("Grabación eliminada.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const reintentar = trpc.grabaciones.reintentar.useMutation({
    onSuccess: () => {
      toast.success("Se volvió a encolar la transcripción.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  const regenerarResumen = trpc.grabaciones.regenerarResumen.useMutation({
    onSuccess: () => {
      toast.success("Resumen regenerado.");
      invalidar();
    },
    onError: (error) => toast.error(error.message),
  });

  /**
   * Grabaciones de un turno. Sondea mientras alguna esté sin terminar y se
   * detiene sola cuando no queda ninguna: un intervalo fijo seguiría pegándole
   * a la base toda la tarde con la ficha abierta.
   */
  function deTurno(turnoId: string, habilitada = true) {
    return trpc.grabaciones.obtenerDeTurno.useQuery(
      { turnoId },
      {
        enabled: habilitada,
        refetchInterval: (consulta) => {
          const datos = consulta.state.data;
          if (!datos) return false;
          const enProceso = datos.grabaciones.some(
            (g) => g.estado === "PENDIENTE" || g.estado === "TRANSCRIBIENDO",
          );
          return enProceso ? INTERVALO_SONDEO_MS : false;
        },
      },
    );
  }

  return {
    deTurno,
    registrar,
    eliminar,
    reintentar,
    regenerarResumen,
  };
}
