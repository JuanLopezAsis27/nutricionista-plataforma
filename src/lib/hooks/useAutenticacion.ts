"use client";

import { trpc } from "@/lib/trpc";

/** Encapsula las mutaciones tRPC del flujo de recuperación de contraseña. */
export function useAutenticacion() {
  const solicitarRecuperacion =
    trpc.autenticacion.solicitarRecuperacion.useMutation();
  const restablecer = trpc.autenticacion.restablecer.useMutation();

  return { solicitarRecuperacion, restablecer };
}
