import type {
  IEstadisticasRepositorio,
  PuntoSerieMensual,
} from "../../repositorios/IEstadisticasRepositorio";

/** Días sin turno ni registro para considerar a un paciente en riesgo de abandono. */
const DIAS_ABANDONO = 60;
/** Meses de la serie de tendencia de turnos. */
const MESES_SERIE = 6;
const DIA_MS = 24 * 60 * 60 * 1000;

/** Resultado de las estadísticas del consultorio. */
export interface EstadisticasConsultorio {
  pacientesActivos: number;
  pacientesNuevos: number;
  pacientesEnRiesgo: number;
  turnos: {
    completados: number;
    cancelados: number;
    pendientes: number; // PENDIENTE + CONFIRMADO
    total: number;
  };
  /** Asistencia = completados / (completados + cancelados), en porcentaje. */
  tasaAsistencia: number;
  ingresos: {
    cobrado: number;
    pendiente: number;
  };
  serieMensual: PuntoSerieMensual[];
  diasAbandono: number;
}

/**
 * Caso de uso: calcular las estadísticas del consultorio para un rango.
 *
 * Combina los agregados crudos del read model y deriva la tasa de asistencia.
 * El umbral de abandono se mide respecto de `hasta` (por defecto 60 días).
 */
export class ObtenerEstadisticas {
  constructor(private readonly repositorio: IEstadisticasRepositorio) {}

  async ejecutar(desde: Date, hasta: Date): Promise<EstadisticasConsultorio> {
    const sinActividadDesde = new Date(
      hasta.getTime() - DIAS_ABANDONO * DIA_MS,
    );

    const datos = await this.repositorio.obtener({
      desde,
      hasta,
      sinActividadDesde,
      meses: MESES_SERIE,
    });

    const { PENDIENTE, CONFIRMADO, CANCELADO, COMPLETADO } =
      datos.turnosPorEstado;
    const pendientes = PENDIENTE + CONFIRMADO;
    const total = pendientes + CANCELADO + COMPLETADO;
    const baseAsistencia = COMPLETADO + CANCELADO;
    const tasaAsistencia =
      baseAsistencia === 0
        ? 0
        : Math.round((COMPLETADO / baseAsistencia) * 1000) / 10;

    return {
      pacientesActivos: datos.pacientesActivos,
      pacientesNuevos: datos.pacientesNuevos,
      pacientesEnRiesgo: datos.pacientesEnRiesgo,
      turnos: {
        completados: COMPLETADO,
        cancelados: CANCELADO,
        pendientes,
        total,
      },
      tasaAsistencia,
      ingresos: {
        cobrado: datos.ingresoCobrado,
        pendiente: datos.ingresoPendiente,
      },
      serieMensual: datos.serieMensual,
      diasAbandono: DIAS_ABANDONO,
    };
  }
}
