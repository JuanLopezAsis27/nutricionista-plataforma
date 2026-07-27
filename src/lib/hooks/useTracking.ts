"use client";

import { trpc } from "@/lib/trpc";

/**
 * Encapsula el Tracking del paciente: `miTracking` (portal, pacienteId de la
 * sesión) y `dePaciente` (nutricionista, pacienteId explícito).
 */
export function useTracking() {
  return {
    miTracking: trpc.tracking.miTracking.useQuery,
    dePaciente: trpc.tracking.dePaciente.useQuery,
  };
}
