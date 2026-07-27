import type {
  IEstadisticasRepositorio,
  TipoDetalleEstadistica,
  PacienteEstadistica,
} from "../../repositorios/IEstadisticasRepositorio";

const DIAS_ABANDONO = 60;
const MESES_SERIE = 6;
const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Caso de uso: desglosar una métrica de estadísticas en la lista de pacientes
 * que la componen (carga perezosa, al abrir el drill-down). Usa el mismo
 * umbral de abandono (60 días) que ObtenerEstadisticas.
 */
export class ObtenerDetalleEstadistica {
  constructor(private readonly repositorio: IEstadisticasRepositorio) {}

  async ejecutar(
    tipo: TipoDetalleEstadistica,
    desde: Date,
    hasta: Date,
  ): Promise<PacienteEstadistica[]> {
    return this.repositorio.listarPacientes(tipo, {
      desde,
      hasta,
      sinActividadDesde: new Date(hasta.getTime() - DIAS_ABANDONO * DIA_MS),
      meses: MESES_SERIE,
    });
  }
}
