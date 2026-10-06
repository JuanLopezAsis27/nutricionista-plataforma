"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import type { IngresosVisibles } from "@/lib/hooks/useIngresosVisibles";

/** El ojo que muestra u oculta los montos de `useIngresosVisibles`. */
export function BotonVerIngresos({ ingresos }: { ingresos: IngresosVisibles }) {
  const etiqueta = ingresos.visibles ? "Ocultar ingresos" : "Mostrar ingresos";
  const Icono = ingresos.visibles ? EyeOff : Eye;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={ingresos.alternar}
      aria-label={etiqueta}
      title={etiqueta}
    >
      <Icono className="h-4 w-4" />
    </Button>
  );
}
