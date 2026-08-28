"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { TEMAS_COMPOSICION, type TemaComposicion } from "./paleta";

/**
 * Tema del dashboard + bandera de montaje.
 *
 * Los gráficos no pueden pintarse en el primer render del servidor: el tema
 * real solo se conoce en el cliente y pintar antes provoca un desajuste de
 * hidratación. `montado` es la señal para no renderizar el SVG todavía.
 */
export function useTemaComposicion(): {
  tema: TemaComposicion;
  montado: boolean;
} {
  const { resolvedTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  return {
    tema:
      resolvedTheme === "dark"
        ? TEMAS_COMPOSICION.dark
        : TEMAS_COMPOSICION.light,
    montado,
  };
}
