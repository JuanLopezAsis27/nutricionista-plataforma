import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IMetricaDispositivoRepositorio } from "@/dominio/repositorios/IMetricaDispositivoRepositorio";
import { ObtenerTrackingDePaciente } from "@/aplicacion/casos-de-uso/tracking/ObtenerTrackingDePaciente";
import { ServicioTracking } from "@/aplicacion/servicios/ServicioTracking";

/** Arma el servicio de Tracking del paciente (read-model compuesto). */
export function crearServicioTracking(deps: {
  pacientes: IPacienteRepositorio;
  registros: IRegistroDiarioRepositorio;
  planes: IAsignacionPlanRepositorio;
  axiomas: IAxiomaRepositorio;
  antropometrias: IAntropometriaRepositorio;
  metricas: IMetricaDispositivoRepositorio;
}): ServicioTracking {
  return new ServicioTracking(
    new ObtenerTrackingDePaciente(
      deps.pacientes,
      deps.registros,
      deps.planes,
      deps.axiomas,
      deps.antropometrias,
      deps.metricas,
    ),
  );
}
