"use client";

import { trpc } from "@/lib/trpc";

/**
 * Encapsula la búsqueda de datos nutricionales (autocompletado de ingredientes).
 * `buscarAlimento` es una query — se usa con un término debounced y `enabled`.
 */
export function useNutricion() {
  return {
    buscarAlimento: trpc.nutricion.buscarAlimento.useQuery,
  };
}
