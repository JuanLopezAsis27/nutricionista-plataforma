import type { IEstadisticasRepositorio } from "@/dominio/repositorios/IEstadisticasRepositorio";
import { ObtenerEstadisticas } from "@/aplicacion/casos-de-uso/estadisticas/ObtenerEstadisticas";
import { ObtenerDetalleEstadistica } from "@/aplicacion/casos-de-uso/estadisticas/ObtenerDetalleEstadistica";
import { ObtenerResumenCobros } from "@/aplicacion/casos-de-uso/estadisticas/ObtenerResumenCobros";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ServicioEstadisticas } from "@/aplicacion/servicios/ServicioEstadisticas";

/** Arma el servicio de Estadísticas. */
export function crearServicioEstadisticas(deps: {
  estadisticas: IEstadisticasRepositorio;
  reloj: IRelojFecha;
}): ServicioEstadisticas {
  return new ServicioEstadisticas(
    new ObtenerEstadisticas(deps.estadisticas),
    new ObtenerDetalleEstadistica(deps.estadisticas),
    new ObtenerResumenCobros(deps.estadisticas, deps.reloj),
  );
}
