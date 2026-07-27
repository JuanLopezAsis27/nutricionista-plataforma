"use client";

import { useTiempoReal } from "@/lib/hooks/useTiempoReal";

/**
 * Monta la suscripción de tiempo real (SSE) para la sesión. No renderiza nada;
 * se coloca una vez en cada layout autenticado (panel y portal).
 */
export function TiempoReal() {
  useTiempoReal();
  return null;
}
