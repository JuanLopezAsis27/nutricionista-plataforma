import type { ObtenerEstadisticas } from "@/aplicacion/casos-de-uso/estadisticas/ObtenerEstadisticas";
import type { ObtenerDetalleEstadistica } from "@/aplicacion/casos-de-uso/estadisticas/ObtenerDetalleEstadistica";
import type { ObtenerResumenCobros } from "@/aplicacion/casos-de-uso/estadisticas/ObtenerResumenCobros";
import type {
  RangoEstadisticasDto,
  EstadisticasSalidaDto,
  DetalleEstadisticaDto,
  PacienteEstadisticaDto,
  ResumenCobrosSalidaDto,
} from "../dtos/estadisticas.dto";

/** Servicio de aplicación de Estadísticas del consultorio. */
export class ServicioEstadisticas {
  constructor(
    private readonly obtenerEstadisticasUC: ObtenerEstadisticas,
    private readonly obtenerDetalleUC: ObtenerDetalleEstadistica,
    private readonly resumenCobrosUC: ObtenerResumenCobros,
  ) {}

  async resumenCobros(): Promise<ResumenCobrosSalidaDto> {
    return this.resumenCobrosUC.ejecutar();
  }

  async obtener(datos: RangoEstadisticasDto): Promise<EstadisticasSalidaDto> {
    return this.obtenerEstadisticasUC.ejecutar(datos.desde, datos.hasta);
  }

  async detalle(
    datos: DetalleEstadisticaDto,
  ): Promise<PacienteEstadisticaDto[]> {
    return this.obtenerDetalleUC.ejecutar(datos.tipo, datos.desde, datos.hasta);
  }
}
