/**
 * Puerto de lectura (read model / CQRS) para las estadísticas del consultorio.
 *
 * Devuelve agregados crudos calculados eficientemente en la base; el caso de
 * uso los combina y deriva las tasas. El dominio no conoce Prisma.
 */

/** Parámetros del período a analizar. */
export interface ParametrosEstadisticas {
  /** Inicio del rango para nuevos pacientes, turnos e ingresos. */
  desde: Date;
  /** Fin del rango. */
  hasta: Date;
  /** Umbral de abandono: sin turno ni registro desde esta fecha. */
  sinActividadDesde: Date;
  /** Cantidad de meses de la serie de tendencia. */
  meses: number;
}

/** Un punto de la serie mensual de turnos. */
export interface PuntoSerieMensual {
  /** Mes en formato "AAAA-MM". */
  mes: string;
  total: number;
  completados: number;
}

/** Agregados crudos que devuelve la base. */
export interface DatosCrudosEstadisticas {
  pacientesActivos: number;
  pacientesNuevos: number;
  pacientesEnRiesgo: number;
  turnosPorEstado: {
    PENDIENTE: number;
    CONFIRMADO: number;
    CANCELADO: number;
    COMPLETADO: number;
  };
  ingresoCobrado: number;
  ingresoPendiente: number;
  serieMensual: PuntoSerieMensual[];
}

/** Categorías de pacientes que se pueden desglosar (drill-down). */
export type TipoDetalleEstadistica = "EN_RIESGO" | "NUEVOS" | "ACTIVOS";

/** Un paciente en el desglose, con una fecha de referencia según la categoría. */
export interface PacienteEstadistica {
  id: string;
  nombre: string;
  apellido: string;
  /** EN_RIESGO → última actividad; NUEVOS/ACTIVOS → alta. Null si no aplica. */
  referencia: Date | null;
}

export interface IEstadisticasRepositorio {
  obtener(params: ParametrosEstadisticas): Promise<DatosCrudosEstadisticas>;
  /** Lista los pacientes de una categoría (para el desglose bajo demanda). */
  listarPacientes(
    tipo: TipoDetalleEstadistica,
    params: ParametrosEstadisticas,
  ): Promise<PacienteEstadistica[]>;
}
