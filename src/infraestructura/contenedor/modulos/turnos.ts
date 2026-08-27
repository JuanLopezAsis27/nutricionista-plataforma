import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import { AgendarTurno } from "@/dominio/casos-de-uso/turnos/AgendarTurno";
import { ObtenerTurnos } from "@/dominio/casos-de-uso/turnos/ObtenerTurnos";
import { ObtenerTurnosPorPaciente } from "@/dominio/casos-de-uso/turnos/ObtenerTurnosPorPaciente";
import { ActualizarEstadoTurno } from "@/dominio/casos-de-uso/turnos/ActualizarEstadoTurno";
import { CancelarTurno } from "@/dominio/casos-de-uso/turnos/CancelarTurno";
import { ReprogramarTurno } from "@/dominio/casos-de-uso/turnos/ReprogramarTurno";
import { RegistrarCobroTurno } from "@/dominio/casos-de-uso/turnos/RegistrarCobroTurno";
import { ObtenerRecordatoriosDeTurnos } from "@/dominio/casos-de-uso/whatsapp/ObtenerRecordatoriosDeTurnos";
import { ServicioTurno } from "@/aplicacion/servicios/ServicioTurno";

/** Arma el servicio de Turnos con sus casos de uso. */
export function crearServicioTurno(deps: {
  turnos: ITurnoRepositorio;
  pacientes: IPacienteRepositorio;
  sincronizador: ISincronizadorCalendario;
  recordatorios: IRecordatorioWhatsappRepositorio;
}): ServicioTurno {
  // CancelarTurno compone ActualizarEstadoTurno: comparten instancia.
  const actualizarEstadoTurno = new ActualizarEstadoTurno(deps.turnos);

  return new ServicioTurno(
    new AgendarTurno(deps.turnos, deps.pacientes),
    new ObtenerTurnos(deps.turnos),
    new ObtenerTurnosPorPaciente(deps.turnos, deps.pacientes),
    actualizarEstadoTurno,
    new CancelarTurno(deps.turnos, actualizarEstadoTurno),
    new ReprogramarTurno(deps.turnos),
    new RegistrarCobroTurno(deps.turnos),
    deps.sincronizador,
    new ObtenerRecordatoriosDeTurnos(deps.recordatorios),
  );
}
