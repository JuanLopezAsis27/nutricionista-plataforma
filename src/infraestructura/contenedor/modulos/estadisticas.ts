import type { IEstadisticasRepositorio } from "@/dominio/repositorios/IEstadisticasRepositorio";
import { ObtenerEstadisticas } from "@/dominio/casos-de-uso/estadisticas/ObtenerEstadisticas";
import { ObtenerDetalleEstadistica } from "@/dominio/casos-de-uso/estadisticas/ObtenerDetalleEstadistica";
import { ServicioEstadisticas } from "@/aplicacion/servicios/ServicioEstadisticas";

/** Arma el servicio de Estadísticas. */
export function crearServicioEstadisticas(deps: {
  estadisticas: IEstadisticasRepositorio;
}): ServicioEstadisticas {
  return new ServicioEstadisticas(
    new ObtenerEstadisticas(deps.estadisticas),
    new ObtenerDetalleEstadistica(deps.estadisticas),
  );
}
