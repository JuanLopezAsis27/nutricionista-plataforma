"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve una versión "retrasada" del valor que solo se actualiza tras
 * `retrasoMs` milisegundos sin cambios. Útil para buscadores (debounce).
 */
export function useDebounce<T>(valor: T, retrasoMs = 300): T {
  const [valorRetrasado, setValorRetrasado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setValorRetrasado(valor), retrasoMs);
    return () => clearTimeout(temporizador);
  }, [valor, retrasoMs]);

  return valorRetrasado;
}
