import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import type { EstadoTurno } from "@/dominio/entidades/Turno";

/**
 * Disponibilidad de la agenda del consultorio, del lado de la pantalla.
 *
 * La regla dura vive en el dominio (`servicios/agendaConsultorio` +
 * `AgendarTurno`): esto NO la reemplaza, la anticipa. El servidor sigue
 * rechazando un turno fuera de la agenda; acá se apagan de antemano las
 * opciones que iba a rechazar, para que el profesional no descubra el
 * problema recién al apretar "Agendar".
 *
 * Por eso los motivos son tres y se muestran distinto: "ocupado" es otro
 * turno, "pasado" es la hora que ya se fue (solo hoy) y "cierra" es que la
 * consulta no termina antes de cerrar.
 */

export type MotivoNoDisponible = "ocupado" | "pasado" | "cierra";

export interface FranjaAgenda {
  hora: string;
  disponible: boolean;
  motivo: MotivoNoDisponible | null;
}

/** Turno ya agendado, en la forma mínima que necesita el cálculo. */
export interface TurnoOcupando {
  id: string;
  fecha: Date | string;
  hora: string;
  duracionMinutos: number;
  estado: EstadoTurno;
}

export const NOMBRES_DIA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

/** "HH:mm" → minutos desde medianoche. */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** minutos desde medianoche → "HH:mm". */
export function aHora(minutos: number): string {
  const h = String(Math.floor(minutos / 60)).padStart(2, "0");
  const m = String(minutos % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Día de la semana (0=domingo) de un "YYYY-MM-DD".
 *
 * Se interpreta en UTC igual que en el dominio: `new Date("2026-07-06")` ya es
 * medianoche UTC, y leerlo con `getDay()` correría el día para atrás en
 * cualquier huso al oeste de Greenwich —el lunes se vería como domingo—.
 */
export function diaSemanaISO(fechaISO: string): number {
  return new Date(`${fechaISO}T00:00:00Z`).getUTCDay();
}

/** ¿El consultorio atiende ese día? Lista vacía = sin restricción. */
export function esDiaDeAtencion(
  config: ConfiguracionSalidaDto,
  fechaISO: string,
): boolean {
  if (config.diasAtencion.length === 0) return true;
  return config.diasAtencion.includes(diaSemanaISO(fechaISO));
}

/** Nombres de los días que el consultorio atiende, para el texto de ayuda. */
export function diasDeAtencionEnTexto(config: ConfiguracionSalidaDto): string {
  if (config.diasAtencion.length === 0) return "todos los días";
  const ordenados = [...config.diasAtencion].sort((a, b) => a - b);
  return ordenados
    .map((d) => NOMBRES_DIA[d] ?? "")
    .filter(Boolean)
    .join(", ");
}

/**
 * Primera fecha (YYYY-MM-DD) desde `desdeISO` inclusive en la que el
 * consultorio atiende. Busca hasta dos semanas: con siete días alcanza para
 * cualquier configuración no vacía, y el margen cubre el caso raro.
 */
export function proximoDiaDeAtencion(
  config: ConfiguracionSalidaDto,
  desdeISO: string,
): string {
  let fecha = new Date(`${desdeISO}T00:00:00Z`);
  for (let intento = 0; intento < 14; intento += 1) {
    const iso = fecha.toISOString().slice(0, 10);
    if (esDiaDeAtencion(config, iso)) return iso;
    fecha = new Date(fecha.getTime() + 24 * 60 * 60 * 1000);
  }
  return desdeISO;
}

interface ParametrosDisponibilidad {
  config: ConfiguracionSalidaDto;
  /** Fecha elegida (YYYY-MM-DD). */
  fechaISO: string;
  /** Duración de la consulta a agendar: define si el turno entra antes de cerrar. */
  duracionMinutos: number;
  /** Turnos ya agendados (se filtran los de otra fecha y los cancelados). */
  ocupados: ReadonlyArray<TurnoOcupando>;
  /** Hoy y ahora, para apagar las horas que ya pasaron. */
  hoyISO: string;
  ahoraHHmm: string;
  /** Turno que se está reprogramando: no se choca consigo mismo. */
  excluirTurnoId?: string;
}

/** Estado de cada franja horaria del día elegido. */
export function franjasDelDia({
  config,
  fechaISO,
  duracionMinutos,
  ocupados,
  hoyISO,
  ahoraHHmm,
  excluirTurnoId,
}: ParametrosDisponibilidad): FranjaAgenda[] {
  const paso = config.turnoPasoMinutos;
  const desde = aMinutos(config.atencionHoraDesde ?? "08:00");
  const hasta = aMinutos(config.atencionHoraHasta ?? "20:00");

  // Rangos [inicio, fin) que ya están tomados ese día. Los cancelados liberan
  // el horario (misma regla que el dominio) y el turno propio no se cuenta.
  const tomados = ocupados
    .filter(
      (t) =>
        t.id !== excluirTurnoId &&
        t.estado !== "CANCELADO" &&
        new Date(t.fecha).toISOString().slice(0, 10) === fechaISO,
    )
    .map((t) => {
      const inicio = aMinutos(t.hora);
      return { inicio, fin: inicio + t.duracionMinutos };
    });

  const franjas: FranjaAgenda[] = [];
  for (let minutos = desde; minutos <= hasta; minutos += paso) {
    const hora = aHora(minutos);
    const fin = minutos + duracionMinutos;

    let motivo: MotivoNoDisponible | null = null;
    if (fin > hasta) {
      motivo = "cierra";
    } else if (fechaISO === hoyISO && hora <= ahoraHHmm) {
      motivo = "pasado";
    } else if (tomados.some((t) => minutos < t.fin && t.inicio < fin)) {
      motivo = "ocupado";
    }

    franjas.push({ hora, disponible: motivo === null, motivo });
  }
  return franjas;
}

/** Etiqueta corta que acompaña a la hora apagada en el desplegable. */
export const ETIQUETA_MOTIVO: Record<MotivoNoDisponible, string> = {
  ocupado: "ocupado",
  pasado: "ya pasó",
  cierra: "fuera de horario",
};
