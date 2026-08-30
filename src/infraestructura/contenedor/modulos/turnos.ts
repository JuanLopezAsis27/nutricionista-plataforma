import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import { AgendarTurno } from "@/aplicacion/casos-de-uso/turnos/AgendarTurno";
import { ObtenerTurnos } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnos";
import { ObtenerTurnosPorPaciente } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import { ActualizarEstadoTurno } from "@/aplicacion/casos-de-uso/turnos/ActualizarEstadoTurno";
import { CancelarTurno } from "@/aplicacion/casos-de-uso/turnos/CancelarTurno";
import { ReprogramarTurno } from "@/aplicacion/casos-de-uso/turnos/ReprogramarTurno";
import { RegistrarCobroTurno } from "@/aplicacion/casos-de-uso/turnos/RegistrarCobroTurno";
import { EliminarTurno } from "@/aplicacion/casos-de-uso/turnos/EliminarTurno";
import { ServicioTurno } from "@/aplicacion/servicios/ServicioTurno";

/** Arma el servicio de Turnos con sus casos de uso. */
export function crearServicioTurno(deps: {
  turnos: ITurnoRepositorio;
  pacientes: IPacienteRepositorio;
  configuracion: IConfiguracionRepositorio;
  sincronizador: ISincronizadorCalendario;
}): ServicioTurno {
  // CancelarTurno compone ActualizarEstadoTurno: comparten instancia.
  const actualizarEstadoTurno = new ActualizarEstadoTurno(deps.turnos);

  return new ServicioTurno(
    new AgendarTurno(deps.turnos, deps.pacientes, deps.configuracion),
    new ObtenerTurnos(deps.turnos),
    new ObtenerTurnosPorPaciente(deps.turnos, deps.pacientes),
    actualizarEstadoTurno,
    new CancelarTurno(deps.turnos, actualizarEstadoTurno),
    new ReprogramarTurno(deps.turnos, deps.configuracion),
    new RegistrarCobroTurno(deps.turnos),
    new EliminarTurno(deps.turnos, deps.sincronizador),
    deps.sincronizador,
  );
}
