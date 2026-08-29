import type { IConfiguracionRepositorio } from "../repositorios/IConfiguracionRepositorio";
import { ConfiguracionConsultorio } from "../entidades/ConfiguracionConsultorio";
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

/** Turno a validar contra la agenda declarada del consultorio. */
export interface FranjaTurno {
  fecha: Date;
  hora: string;
  duracionMinutos: number;
}

/**
 * Regla de negocio compartida por agendar y reprogramar: un turno tiene que
 * caer dentro de la agenda que el consultorio declaró en Configuración.
 *
 * Vive acá y no en cada caso de uso porque son la MISMA regla: mientras estuvo
 * solo en la pantalla de turnos, la configuración de días de atención se podía
 * elegir pero no hacía nada, y se seguían agendando turnos los días cerrados.
 * Un chequeo en la UI no alcanza —el router tRPC es un entry point propio— y
 * duplicarlo en los dos casos de uso deja que uno se olvide al cambiarlo.
 */
export async function verificarDentroDeLaAgenda(
  configuracion: IConfiguracionRepositorio,
  turno: FranjaTurno,
): Promise<void> {
  const config =
    (await configuracion.obtener()) ?? ConfiguracionConsultorio.porDefecto();

  if (!config.atiendeEl(turno.fecha)) {
    const dia = NOMBRES_DIA[turno.fecha.getUTCDay()] ?? "ese día";
    throw new ErrorTurnoFueraDeAtencion(
      `El consultorio no atiende los ${dia}. Cambiá la fecha o sumá el día en Configuración.`,
    );
  }

  if (!config.admiteHorario(turno.hora, turno.duracionMinutos)) {
    const desde = config.atencionHoraDesde ?? "—";
    const hasta = config.atencionHoraHasta ?? "—";
    throw new ErrorTurnoFueraDeAtencion(
      `El turno de las ${turno.hora} (${turno.duracionMinutos} min) no entra en el horario de atención (${desde} a ${hasta}).`,
    );
  }
}
