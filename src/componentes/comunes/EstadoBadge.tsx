import type { EstadoTurno } from "@/dominio/entidades/Turno";
import { ETIQUETAS_ESTADO_TURNO } from "@/lib/formato";
import { cn } from "@/lib/utilidades";

/**
 * Badge de color según el estado del turno.
 *   PENDIENTE  → amarillo
 *   CONFIRMADO → azul
 *   COMPLETADO → verde
 *   CANCELADO  → rojo
 */
const COLORES: Record<EstadoTurno, string> = {
  PENDIENTE:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900",
  CONFIRMADO:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  COMPLETADO:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
  CANCELADO:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
};

export function EstadoBadge({ estado }: { estado: EstadoTurno }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        COLORES[estado],
      )}
    >
      {ETIQUETAS_ESTADO_TURNO[estado]}
    </span>
  );
}
