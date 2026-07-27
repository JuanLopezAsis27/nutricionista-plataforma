import type { ObtenerEstadisticas } from "@/dominio/casos-de-uso/estadisticas/ObtenerEstadisticas";
import type { ObtenerDetalleEstadistica } from "@/dominio/casos-de-uso/estadisticas/ObtenerDetalleEstadistica";
import type {
  RangoEstadisticasDto,
  EstadisticasSalidaDto,
  DetalleEstadisticaDto,
  PacienteEstadisticaDto,
} from "../dtos/estadisticas.dto";

/** Servicio de aplicación de Estadísticas del consultorio. */
export class ServicioEstadisticas {
  constructor(
    private readonly obtenerEstadisticasUC: ObtenerEstadisticas,
    private readonly obtenerDetalleUC: ObtenerDetalleEstadistica,
  ) {}

  async obtener(datos: RangoEstadisticasDto): Promise<EstadisticasSalidaDto> {
    return this.obtenerEstadisticasUC.ejecutar(datos.desde, datos.hasta);
  }

  async detalle(datos: DetalleEstadisticaDto): Promise<PacienteEstadisticaDto[]> {
    return this.obtenerDetalleUC.ejecutar(datos.tipo, datos.desde, datos.hasta);
  }
}
