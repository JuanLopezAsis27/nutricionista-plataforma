"use client";

import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import {
  METODOS_GRASA,
  DEFINICIONES_METODO,
} from "@/dominio/servicios/grasaPorPliegues";
import { cn } from "@/lib/utilidades";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/componentes/ui/select";

/**
 * El filtro de ecuación de la serie de grasa, compartido por el dashboard del
 * profesional y la vista del paciente.
 *
 * Vive acá y no dentro de una de las dos pantallas porque las dos ofrecen la
 * MISMA lectura y tienen que ofrecerla igual: si el paciente pregunta por un
 * número, los dos tienen que poder poner la pantalla en el mismo estado.
 */

/**
 * Qué ecuaciones muestra la serie: una sola, o todas juntas.
 *
 * `TODAS` no es "ninguna elegida": es una lectura propia —la dispersión entre
 * ecuaciones—, y por eso es un valor del filtro y no la ausencia de valor.
 */
export const TODAS_LAS_ECUACIONES = "TODAS";
export type SeleccionEcuacion = MetodoGrasa | typeof TODAS_LAS_ECUACIONES;

/**
 * Las ecuaciones que al menos una medición de la serie resolvió, en el orden
 * de `METODOS_GRASA`.
 *
 * No hace falta filtrar por las activas del consultorio: los resultados llegan
 * ya filtrados desde `ObtenerComposicionCorporal`, que oculta una ecuación
 * desmarcada incluso en mediciones viejas que la tenían calculada. Si acá se
 * volviera a filtrar, habría dos lugares que decidir lo mismo.
 */
export function ecuacionesDeLaSerie(
  mediciones: MedicionComposicionDto[],
): MetodoGrasa[] {
  const resueltas = new Set(
    mediciones.flatMap((medicion) =>
      medicion.resultado.grasaPorPliegues.resultados.map((r) => r.metodo),
    ),
  );
  return METODOS_GRASA.filter((metodo) => resueltas.has(metodo));
}

/** Las ecuaciones a dibujar para una selección dada. */
export function ecuacionesElegidas(
  seleccion: SeleccionEcuacion,
  disponibles: MetodoGrasa[],
): MetodoGrasa[] {
  return seleccion === TODAS_LAS_ECUACIONES
    ? disponibles
    : disponibles.filter((metodo) => metodo === seleccion);
}

/**
 * Con una sola ecuación disponible no se dibuja: un desplegable de una opción
 * es un botón que no hace nada, y el gráfico ya la nombra en su leyenda.
 */
export function SelectorEcuacion({
  seleccion,
  disponibles,
  alCambiar,
  className,
}: {
  seleccion: SeleccionEcuacion;
  disponibles: MetodoGrasa[];
  alCambiar: (seleccion: SeleccionEcuacion) => void;
  className?: string;
}) {
  if (disponibles.length <= 1) return null;

  return (
    <Select
      value={seleccion}
      onValueChange={(valor) => alCambiar(valor as SeleccionEcuacion)}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-auto min-w-[14rem] text-xs font-normal",
          className,
        )}
        aria-label="Ecuación de grasa de la serie"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={TODAS_LAS_ECUACIONES}>
          Todas las ecuaciones
        </SelectItem>
        {disponibles.map((metodo) => (
          <SelectItem key={metodo} value={metodo}>
            {DEFINICIONES_METODO[metodo].etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
