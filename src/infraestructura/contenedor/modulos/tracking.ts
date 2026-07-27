import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IPlanRepositorio } from "@/dominio/repositorios/IPlanRepositorio";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ObtenerTrackingDePaciente } from "@/dominio/casos-de-uso/tracking/ObtenerTrackingDePaciente";
import { ServicioTracking } from "@/aplicacion/servicios/ServicioTracking";

/** Arma el servicio de Tracking del paciente (read-model compuesto). */
export function crearServicioTracking(deps: {
  pacientes: IPacienteRepositorio;
  registros: IRegistroDiarioRepositorio;
  planes: IPlanRepositorio;
  axiomas: IAxiomaRepositorio;
  antropometrias: IAntropometriaRepositorio;
}): ServicioTracking {
  return new ServicioTracking(
    new ObtenerTrackingDePaciente(
      deps.pacientes,
      deps.registros,
      deps.planes,
      deps.axiomas,
      deps.antropometrias,
    ),
  );
}
