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

/**
 * Corte por establecimiento del período.
 *
 * Sale gratis del modelo: `precio` y `pagado` ya viven en `Turno` y el turno
 * sabe en qué sede fue. Es el número que el profesional necesita para decidir
 * si un consultorio se sostiene, y con una sola agenda global no existía.
 */
export interface EstadisticaEstablecimiento {
  establecimientoId: string;
  nombre: string;
  turnos: number;
  completados: number;
  ingresoCobrado: number;
  ingresoPendiente: number;
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
  /** Ordenado por ingreso cobrado descendente. Vacío si no hubo turnos. */
  porEstablecimiento: EstadisticaEstablecimiento[];
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

/**
 * Plata de los turnos de un rango de fechas, sin importar si ya pasaron.
 *
 * `cobrado` son los turnos marcados pagados —también los que se pagaron por
 * adelantado y todavía no ocurrieron—; `pendiente`, los que tienen precio, no
 * están pagados y no se cancelaron (un cancelado no es plata que vaya a
 * entrar).
 */
export interface TotalesCobro {
  cobrado: number;
  pendiente: number;
  /** Cuántos turnos forman el pendiente. */
  turnosPendientes: number;
}

export interface IEstadisticasRepositorio {
  obtener(params: ParametrosEstadisticas): Promise<DatosCrudosEstadisticas>;
  /**
   * Totales de cobro de los turnos con fecha entre `desde` y `hasta`, los dos
   * días incluidos. `hasta` null = sin tope: todo lo que viene.
   */
  cobrosEntre(desde: Date, hasta: Date | null): Promise<TotalesCobro>;
  /** Lista los pacientes de una categoría (para el desglose bajo demanda). */
  listarPacientes(
    tipo: TipoDetalleEstadistica,
    params: ParametrosEstadisticas,
  ): Promise<PacienteEstadistica[]>;
}
