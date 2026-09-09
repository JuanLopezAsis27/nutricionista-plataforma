import type { Establecimiento } from "../entidades/Establecimiento";
import { ErrorTurnoFueraDeAtencion } from "../errores/ErrorTurnoFueraDeAtencion";

const NOMBRES_DIA = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

/** Turno a validar contra la agenda declarada del establecimiento. */
export interface FranjaTurno {
  fecha: Date;
  hora: string;
  duracionMinutos: number;
}

/**
 * Regla de negocio compartida por agendar y reprogramar: un turno tiene que
 * caer dentro de la agenda que se declaró para el LUGAR donde se atiende.
 *
 * Vive acá y no en cada caso de uso porque son la MISMA regla: mientras estuvo
 * solo en la pantalla de turnos, la configuración de días de atención se podía
 * elegir pero no hacía nada, y se seguían agendando turnos los días cerrados.
 * Un chequeo en la UI no alcanza —el router tRPC es un entry point propio— y
 * duplicarlo en los dos casos de uso deja que uno se olvide al cambiarlo.
 *
 * Desde la migración 49 la agenda es del establecimiento y no del consultorio:
 * "lunes y miércoles en el centro, martes y jueves en el barrio" no se podía
 * expresar con una sola lista de días para todo el consultorio. Por eso recibe
 * la entidad ya resuelta en vez del repositorio de configuración: quién decide
 * en qué sede cae el turno es el caso de uso, y acá solo se lo compara.
 */
export function verificarDentroDeLaAgenda(
  establecimiento: Establecimiento,
  turno: FranjaTurno,
): void {
  if (!establecimiento.atiendeEl(turno.fecha)) {
    const dia = NOMBRES_DIA[turno.fecha.getUTCDay()] ?? "ese día";
    throw new ErrorTurnoFueraDeAtencion(
      `En «${establecimiento.nombre}» no se atiende los ${dia}. Cambiá la fecha, elegí otro establecimiento o sumá el día en Configuración.`,
    );
  }

  if (!establecimiento.admiteHorario(turno.hora, turno.duracionMinutos)) {
    const desde = establecimiento.atencionHoraDesde ?? "—";
    const hasta = establecimiento.atencionHoraHasta ?? "—";
    throw new ErrorTurnoFueraDeAtencion(
      `El turno de las ${turno.hora} (${turno.duracionMinutos} min) no entra en el horario de «${establecimiento.nombre}» (${desde} a ${hasta}).`,
    );
  }
}
