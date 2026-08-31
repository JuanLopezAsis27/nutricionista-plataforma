import type { TurnoSalidaDto } from "@/aplicacion/dtos/turno.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import { aMinutos } from "@/lib/agenda";

/**
 * Cálculo de la grilla semanal de turnos (la vista de 7 días con las horas).
 *
 * Es geometría, no reglas de negocio: qué días entran en la ventana, entre qué
 * horas hay que dibujar y cómo se reparten los turnos que se pisan. Vive fuera
 * del componente porque es lo único de esa pantalla que se puede probar sin
 * montar nada, y porque el reparto de carriles es la parte que se rompe
 * callada: un turno mal ubicado no tira error, simplemente tapa a otro.
 *
 * Todas las fechas son "YYYY-MM-DD" y se manipulan en UTC, igual que en el
 * resto del módulo: `Turno.fecha` es un `DATE` que llega como medianoche UTC y
 * leerlo en horario local corre el día para atrás.
 */

/** Un turno ya ubicado en la grilla. */
export interface BloqueTurno {
  turno: TurnoSalidaDto;
  /** Minutos desde medianoche en que empieza. */
  inicioMinutos: number;
  /** Minutos desde medianoche en que termina. */
  finMinutos: number;
  /** Carril que ocupa dentro de su grupo de solapamiento (0 = el de más a la izquierda). */
  carril: number;
  /** Cuántos carriles hay que repartir en ese grupo. Fuera de un solapamiento es 1. */
  carriles: number;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Suma (o resta) días a un "YYYY-MM-DD", en UTC. */
export function sumarDias(fechaISO: string, dias: number): string {
  const base = new Date(`${fechaISO}T00:00:00Z`);
  return new Date(base.getTime() + dias * MS_POR_DIA)
    .toISOString()
    .slice(0, 10);
}

/** Los `cantidad` días consecutivos que arrancan en `anclaISO`, inclusive. */
export function ventanaDeDias(anclaISO: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => sumarDias(anclaISO, i));
}

/**
 * Franja horaria a dibujar, en minutos desde medianoche y redondeada a horas
 * enteras.
 *
 * Arranca en el horario de atención del consultorio —es lo que el profesional
 * espera ver— pero se ESTIRA para que entre cualquier turno que caiga afuera.
 * Los hay: un turno cargado antes de acotar el horario, o una consulta que se
 * extiende más allá del cierre. Recortarlos los haría desaparecer de la
 * pantalla sin ningún aviso, que es la peor forma de perder un turno.
 */
export function rangoHorarioVisible(
  config: Pick<
    ConfiguracionSalidaDto,
    "atencionHoraDesde" | "atencionHoraHasta"
  >,
  turnos: ReadonlyArray<TurnoSalidaDto>,
): { desdeMinutos: number; hastaMinutos: number } {
  let desde = aMinutos(config.atencionHoraDesde ?? "08:00");
  let hasta = aMinutos(config.atencionHoraHasta ?? "20:00");

  for (const turno of turnos) {
    const inicio = aMinutos(turno.hora);
    desde = Math.min(desde, inicio);
    hasta = Math.max(hasta, inicio + turno.duracionMinutos);
  }

  // A horas enteras: las etiquetas de la izquierda son horas en punto.
  desde = Math.max(0, Math.floor(desde / 60) * 60);
  hasta = Math.min(24 * 60, Math.ceil(hasta / 60) * 60);

  // Un consultorio sin horario cargado, o con uno invertido, no puede dejar la
  // grilla de alto cero: se muestra una franja mínima antes que nada.
  if (hasta - desde < 60) hasta = Math.min(24 * 60, desde + 60);

  return { desdeMinutos: desde, hastaMinutos: hasta };
}

/**
 * Ubica los turnos de UN día repartiendo en carriles los que se solapan.
 *
 * Dos turnos a la misma hora no deberían existir —el dominio lo impide— pero
 * un CANCELADO libera el horario y sigue mostrándose, así que en la grilla el
 * cruce es normal, no una anomalía. Se agrupan en cadenas de solapamiento y
 * cada grupo se reparte el ancho de la columna en partes iguales.
 */
export function repartirCarriles(
  turnosDelDia: ReadonlyArray<TurnoSalidaDto>,
): BloqueTurno[] {
  const ordenados = [...turnosDelDia].sort(
    (a, b) =>
      a.hora.localeCompare(b.hora) || b.duracionMinutos - a.duracionMinutos,
  );

  const ubicados: BloqueTurno[] = [];
  let grupo: BloqueTurno[] = [];
  let finDelGrupo = -1;

  /** Fija `carriles` en todo el grupo: el ancho lo define el más poblado. */
  function cerrarGrupo() {
    const carriles = grupo.reduce((max, b) => Math.max(max, b.carril + 1), 0);
    for (const bloque of grupo) bloque.carriles = carriles;
    ubicados.push(...grupo);
    grupo = [];
    finDelGrupo = -1;
  }

  for (const turno of ordenados) {
    const inicioMinutos = aMinutos(turno.hora);
    const finMinutos = inicioMinutos + turno.duracionMinutos;

    // Si arranca después de que terminó todo el grupo anterior, es otro grupo.
    if (grupo.length > 0 && inicioMinutos >= finDelGrupo) cerrarGrupo();

    // Primer carril donde no pisa a nadie: reutilizar el hueco que dejó un
    // turno ya terminado es lo que evita una columna por turno del día.
    let carril = 0;
    while (
      grupo.some((b) => b.carril === carril && b.finMinutos > inicioMinutos)
    ) {
      carril += 1;
    }

    grupo.push({ turno, inicioMinutos, finMinutos, carril, carriles: 1 });
    finDelGrupo = Math.max(finDelGrupo, finMinutos);
  }

  if (grupo.length > 0) cerrarGrupo();
  return ubicados;
}
