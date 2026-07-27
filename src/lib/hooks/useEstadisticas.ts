"use client";

import { trpc } from "@/lib/trpc";

/** Encapsula las consultas tRPC de estadísticas del consultorio. */
export function useEstadisticas() {
  return {
    obtener: trpc.estadisticas.obtener.useQuery,
    detalle: trpc.estadisticas.detalle.useQuery,
  };
}
