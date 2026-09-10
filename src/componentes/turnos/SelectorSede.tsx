"use client";

import { MapPin } from "lucide-react";
import type { EstablecimientoSalidaDto } from "@/aplicacion/dtos/establecimiento.dto";
import { useSedeActiva } from "@/lib/hooks/useSedeActiva";
import { etiquetaSede, TODAS_LAS_SEDES } from "@/lib/sedes";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

/**
 * Qué establecimiento está gestionando el profesional.
 *
 * La opción «Todos» no es un caso borde: es el calendario unificado, que
 * muestra la semana completa con los turnos de todas las sedes juntas. El
 * profesional no puede estar en dos lugares a la vez, así que su agenda real es
 * una sola; elegir una sede es para concentrarse en un lugar, no para separar
 * agendas.
 *
 * Con una sola sede el selector no se dibuja: no hay nada que elegir y ocuparía
 * lugar en la barra para decir siempre lo mismo.
 */
export function SelectorSede({
  sedes,
  colores,
}: {
  sedes: ReadonlyArray<EstablecimientoSalidaDto>;
  colores: Map<string, string>;
}) {
  const { sedeActiva, elegirSede } = useSedeActiva();

  if (sedes.length <= 1) return null;

  return (
    <Select value={sedeActiva} onValueChange={elegirSede}>
      <SelectTrigger className="w-64">
        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Establecimiento" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODAS_LAS_SEDES}>Todos los consultorios</SelectItem>
        {sedes.map((sede) => (
          <SelectItem key={sede.id} value={sede.id}>
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colores.get(sede.id) }}
              />
              <span className="truncate">{etiquetaSede(sede)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
