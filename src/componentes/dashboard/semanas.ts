import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import { aFechaISO } from "@/lib/formato";

/**
 * El reparto de turnos en semanas del gráfico del dashboard.
 *
 * Va en un módulo aparte del componente para poder testearlo: la cuenta tiene
 * una trampa de husos horarios que no se ve mirando el gráfico —solo se nota
 * como "los turnos del lunes aparecen en la semana pasada"— y ese es
 * exactamente el error que hay que congelar con un test.
 */

/** Cuántas semanas hacia atrás muestra el gráfico, la actual incluida. */
export const SEMANAS = 8;

export interface SemanaDeTurnos {
  /** Lunes de la semana, en ISO (la clave y el orden). */
  inicio: string;
  etiqueta: string;
  agendados: number;
  completados: number;
}

/**
 * El lunes de la semana de esa fecha (ISO → ISO).
 *
 * Todo el cálculo va en UTC. `Turno.fecha` es un DATE que llega como
 * medianoche UTC: al oeste de Greenwich, `getDay()` sobre esa fecha devuelve
 * el día ANTERIOR, y los turnos del lunes caerían en la semana pasada. Es la
 * misma trampa que ya documenta AGENTS para el día de la semana de un turno.
 *
 * La semana arranca el lunes porque así se lee la agenda del consultorio, no
 * el domingo del índice 0.
 */
export function lunesDe(fechaISO: string): string {
  const fecha = new Date(fechaISO);
  const diasDesdeLunes = (fecha.getUTCDay() + 6) % 7;
  return aFechaISO(new Date(fecha.getTime() - diasDesdeLunes * 86_400_000));
}

/** Reparte los turnos en las últimas `SEMANAS` semanas, la actual incluida. */
export function agruparPorSemana(
  turnos: TurnoSalidaDto[],
  lunesActual: string,
): SemanaDeTurnos[] {
  const semanas = new Map<string, SemanaDeTurnos>();
  const base = new Date(lunesActual);
  for (let i = SEMANAS - 1; i >= 0; i--) {
    const inicio = new Date(base.getTime() - i * 7 * 86_400_000);
    const clave = aFechaISO(inicio);
    semanas.set(clave, {
      inicio: clave,
      etiqueta: `${String(inicio.getUTCDate()).padStart(2, "0")}/${String(
        inicio.getUTCMonth() + 1,
      ).padStart(2, "0")}`,
      agendados: 0,
      completados: 0,
    });
  }

  for (const turno of turnos) {
    const semana = semanas.get(lunesDe(aFechaISO(turno.fecha)));
    if (!semana) continue; // fuera de la ventana de ocho semanas
    if (turno.estado === "CANCELADO") continue;
    semana.agendados += 1;
    if (turno.estado === "COMPLETADO") semana.completados += 1;
  }

  return [...semanas.values()];
}
