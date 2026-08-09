import type { IMetricaDispositivoRepositorio } from "@/dominio/repositorios/IMetricaDispositivoRepositorio";
import { ImportarMetricas } from "@/dominio/casos-de-uso/metricas/ImportarMetricas";
import { ObtenerMetricasDelPaciente } from "@/dominio/casos-de-uso/metricas/ObtenerMetricasDelPaciente";
import { FijarInclusionDia } from "@/dominio/casos-de-uso/metricas/FijarInclusionDia";
import { ServicioMetricas } from "@/aplicacion/servicios/ServicioMetricas";

/** Arma el servicio de métricas de dispositivo (wearables). */
export function crearServicioMetricas(deps: {
  metricas: IMetricaDispositivoRepositorio;
}): ServicioMetricas {
  return new ServicioMetricas(
    new ImportarMetricas(deps.metricas),
    new ObtenerMetricasDelPaciente(deps.metricas),
    new FijarInclusionDia(deps.metricas),
  );
}
