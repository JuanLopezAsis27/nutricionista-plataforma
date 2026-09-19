import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IEstablecimientoRepositorio } from "@/dominio/repositorios/IEstablecimientoRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { EmitirNotificacion } from "@/aplicacion/casos-de-uso/notificaciones/EmitirNotificacion";
import { AgendarTurno } from "@/aplicacion/casos-de-uso/turnos/AgendarTurno";
import { ObtenerTurnos } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnos";
import { ObtenerTurnosPorPaciente } from "@/aplicacion/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import { ActualizarEstadoTurno } from "@/aplicacion/casos-de-uso/turnos/ActualizarEstadoTurno";
import { CancelarTurno } from "@/aplicacion/casos-de-uso/turnos/CancelarTurno";
import { ReprogramarTurno } from "@/aplicacion/casos-de-uso/turnos/ReprogramarTurno";
import { RegistrarCobroTurno } from "@/aplicacion/casos-de-uso/turnos/RegistrarCobroTurno";
import { EliminarTurno } from "@/aplicacion/casos-de-uso/turnos/EliminarTurno";
import { ConfirmarAsistenciaTurno } from "@/aplicacion/casos-de-uso/turnos/ConfirmarAsistenciaTurno";
import { ServicioTurno } from "@/aplicacion/servicios/ServicioTurno";

/** Arma el servicio de Turnos con sus casos de uso. */
export function crearServicioTurno(deps: {
  turnos: ITurnoRepositorio;
  pacientes: IPacienteRepositorio;
  establecimientos: IEstablecimientoRepositorio;
  sincronizador: ISincronizadorCalendario;
  usuarios: IUsuarioRepositorio;
  servicioEmail: IServicioEmail;
  bus: IBusEventos;
  notificaciones: INotificacionRepositorio;
  reloj: IRelojFecha;
}): ServicioTurno {
  // CancelarTurno compone ActualizarEstadoTurno: comparten instancia.
  const actualizarEstadoTurno = new ActualizarEstadoTurno(deps.turnos);

  return new ServicioTurno(
    new AgendarTurno(deps.turnos, deps.pacientes, deps.establecimientos),
    new ObtenerTurnos(deps.turnos),
    new ObtenerTurnosPorPaciente(deps.turnos, deps.pacientes),
    actualizarEstadoTurno,
    new CancelarTurno(deps.turnos, actualizarEstadoTurno),
    new ReprogramarTurno(deps.turnos, deps.establecimientos),
    new RegistrarCobroTurno(deps.turnos),
    new EliminarTurno(deps.turnos, deps.sincronizador),
    new ConfirmarAsistenciaTurno(
      deps.turnos,
      deps.pacientes,
      deps.usuarios,
      deps.servicioEmail,
      deps.bus,
      // Que la confirmación quede en la campana y se pueda marcar vista: el
      // email se pierde entre otros y el evento del bus es efímero.
      new EmitirNotificacion(deps.notificaciones, deps.reloj),
    ),
    deps.sincronizador,
    deps.establecimientos,
    deps.pacientes,
  );
}
