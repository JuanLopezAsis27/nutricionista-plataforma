"use client";

import { ChevronDown } from "lucide-react";
import type { EstadoTurno } from "@/dominio/entidades/Turno";
import { ETIQUETAS_ESTADO_TURNO } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/componentes/ui/dropdown-menu";

/** Transiciones de estado permitidas (espejo de la máquina del dominio). */
const TRANSICIONES: Record<EstadoTurno, EstadoTurno[]> = {
  PENDIENTE: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["COMPLETADO", "CANCELADO"],
  COMPLETADO: [],
  CANCELADO: [],
};

interface PropsSelectorEstado {
  estadoActual: EstadoTurno;
  onCambiar: (nuevo: EstadoTurno) => void;
  deshabilitado?: boolean;
}

/**
 * Dropdown para cambiar el estado de un turno. Solo ofrece las transiciones
 * válidas; si el estado es final (COMPLETADO/CANCELADO) se muestra deshabilitado.
 */
export function SelectorEstado({
  estadoActual,
  onCambiar,
  deshabilitado = false,
}: PropsSelectorEstado) {
  const opciones = TRANSICIONES[estadoActual];
  const sinOpciones = opciones.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={deshabilitado || sinOpciones}>
          Cambiar estado
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      {!sinOpciones && (
        <DropdownMenuContent align="end">
          {opciones.map((estado) => (
            <DropdownMenuItem key={estado} onClick={() => onCambiar(estado)}>
              {ETIQUETAS_ESTADO_TURNO[estado]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
