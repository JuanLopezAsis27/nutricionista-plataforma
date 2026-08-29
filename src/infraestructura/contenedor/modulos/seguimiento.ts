import type { ISuplementoRepositorio } from "@/dominio/repositorios/ISuplementoRepositorio";
import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import { RegistrarSuplemento } from "@/dominio/casos-de-uso/seguimiento/RegistrarSuplemento";
import { ActualizarSuplemento } from "@/dominio/casos-de-uso/seguimiento/ActualizarSuplemento";
import { EliminarSuplemento } from "@/dominio/casos-de-uso/seguimiento/EliminarSuplemento";
import { ObtenerSuplementosDelPaciente } from "@/dominio/casos-de-uso/seguimiento/ObtenerSuplementosDelPaciente";
import { GenerarAlertasDeSeguimiento } from "@/dominio/casos-de-uso/seguimiento/GenerarAlertasDeSeguimiento";
import { ObtenerAlertasPendientes } from "@/dominio/casos-de-uso/seguimiento/ObtenerAlertasPendientes";
import { ContarAlertasPendientes } from "@/dominio/casos-de-uso/seguimiento/ContarAlertasPendientes";
import { ResolverAlerta } from "@/dominio/casos-de-uso/seguimiento/ResolverAlerta";
import { ObtenerInformeProgreso } from "@/dominio/casos-de-uso/seguimiento/ObtenerInformeProgreso";
import { ObtenerInformeHabitos } from "@/dominio/casos-de-uso/seguimiento/ObtenerInformeHabitos";
import { ServicioSeguimiento } from "@/aplicacion/servicios/ServicioSeguimiento";

/** Arma el servicio de Seguimiento (suplementos + alertas + informes). */
export function crearServicioSeguimiento(deps: {
  suplementos: ISuplementoRepositorio;
  alertas: IAlertaSeguimientoRepositorio;
  pacientes: IPacienteRepositorio;
  registros: IRegistroDiarioRepositorio;
  antropometrias: IAntropometriaRepositorio;
  planes: IPlanRepositorio;
  turnos: ITurnoRepositorio;
  usuarios: IUsuarioRepositorio;
  reloj: IRelojFecha;
  bus: IBusEventos;
}): ServicioSeguimiento {
  return new ServicioSeguimiento(
    new RegistrarSuplemento(deps.suplementos, deps.pacientes),
    new ActualizarSuplemento(deps.suplementos),
    new EliminarSuplemento(deps.suplementos),
    new ObtenerSuplementosDelPaciente(deps.suplementos),
    new GenerarAlertasDeSeguimiento(
      deps.alertas,
      deps.pacientes,
      deps.registros,
      deps.planes,
      deps.turnos,
      deps.reloj,
    ),
    new ObtenerAlertasPendientes(deps.alertas),
    new ContarAlertasPendientes(deps.alertas),
    new ResolverAlerta(deps.alertas),
    new ObtenerInformeProgreso(
      deps.antropometrias,
      deps.registros,
      deps.pacientes,
    ),
    new ObtenerInformeHabitos(deps.registros, deps.pacientes),
    deps.usuarios,
    deps.bus,
  );
}
