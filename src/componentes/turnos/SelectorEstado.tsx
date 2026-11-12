"use client";

import { ChevronDown } from "lucide-react";
import {
  TRANSICIONES_TURNO,
  type EstadoTurno,
} from "@/dominio/entidades/Turno";
import { etiquetaTransicionTurno } from "@/lib/formato";
import { Button } from "@/componentes/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/componentes/ui/dropdown-menu";

interface PropsSelectorEstado {
  estadoActual: EstadoTurno;
  onCambiar: (nuevo: EstadoTurno) => void;
  deshabilitado?: boolean;
}

/**
 * Dropdown para cambiar el estado de un turno. Solo ofrece las transiciones
 * válidas —las del dominio, `TRANSICIONES_TURNO`—; si no hay ninguna
 * (CANCELADO) se muestra deshabilitado.
 */
export function SelectorEstado({
  estadoActual,
  onCambiar,
  deshabilitado = false,
}: PropsSelectorEstado) {
  const opciones = TRANSICIONES_TURNO[estadoActual];
  const sinOpciones = opciones.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={deshabilitado || sinOpciones}
        >
          Cambiar estado
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      {!sinOpciones && (
        <DropdownMenuContent align="end">
          {opciones.map((estado) => (
            <DropdownMenuItem key={estado} onClick={() => onCambiar(estado)}>
              {etiquetaTransicionTurno(estadoActual, estado)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
