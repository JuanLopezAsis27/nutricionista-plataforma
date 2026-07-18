import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Tipos de alerta que genera el seguimiento automático. */
export const TIPOS_ALERTA_SEGUIMIENTO = [
  "SIN_REGISTRO_PESO",
  "SIN_ACTIVIDAD",
  "PLAN_VENCIDO",
  "TURNO_SIN_CONFIRMAR",
] as const;
export type TipoAlertaSeguimiento = (typeof TIPOS_ALERTA_SEGUIMIENTO)[number];

export const ESTADOS_ALERTA_SEGUIMIENTO = ["PENDIENTE", "RESUELTA", "DESCARTADA"] as const;
export type EstadoAlertaSeguimiento = (typeof ESTADOS_ALERTA_SEGUIMIENTO)[number];

/** Datos para generar una alerta nueva. */
export interface DatosNuevaAlertaSeguimiento {
  pacienteId: string;
  tipo: TipoAlertaSeguimiento;
  detalle: string;
  /** Id del disparador (turno, asignación de plan) — evita duplicados. */
  referenciaId?: string | null;
  /** Señales extra (para el análisis/ML futuro). */
  datos?: Record<string, unknown> | null;
}

/** Estado completo de una alerta persistida. */
export interface PropiedadesAlertaSeguimiento {
  id: string;
  pacienteId: string;
  /** Nombre completo del paciente (lo completa el repositorio). */
  pacienteNombre: string | null;
  tipo: TipoAlertaSeguimiento;
  estado: EstadoAlertaSeguimiento;
  detalle: string;
  referenciaId: string | null;
  datos: Record<string, unknown> | null;
  creadoEn: Date;
  resueltaEn: Date | null;
}

/**
 * Entidad de dominio AlertaSeguimiento: aviso al nutricionista generado por
 * el seguimiento automático (cron diario del worker).
 *
 * Invariantes: paciente y detalle obligatorios; nace PENDIENTE; al resolverse
 * (RESUELTA o DESCARTADA) queda registrada la fecha.
 */
export class AlertaSeguimiento {
  private constructor(private readonly props: PropiedadesAlertaSeguimiento) {}

  static crear(
    datos: DatosNuevaAlertaSeguimiento,
    id: string,
    ahora: Date = new Date(),
  ): AlertaSeguimiento {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("La alerta debe pertenecer a un paciente.");
    }
    const detalle = datos.detalle?.trim() ?? "";
    if (detalle.length === 0) {
      throw new ErrorValidacion("La alerta debe tener un detalle.");
    }

    return new AlertaSeguimiento({
      id,
      pacienteId: datos.pacienteId,
      pacienteNombre: null,
      tipo: datos.tipo,
      estado: "PENDIENTE",
      detalle,
      referenciaId: datos.referenciaId ?? null,
      datos: datos.datos ?? null,
      creadoEn: ahora,
      resueltaEn: null,
    });
  }

  static reconstruir(props: PropiedadesAlertaSeguimiento): AlertaSeguimiento {
    return new AlertaSeguimiento(props);
  }

  /** Marca la alerta como RESUELTA o DESCARTADA (inmutable). */
  resolver(estado: Exclude<EstadoAlertaSeguimiento, "PENDIENTE">, ahora: Date = new Date()): AlertaSeguimiento {
    if (this.props.estado !== "PENDIENTE") {
      throw new ErrorValidacion("La alerta ya fue resuelta o descartada.");
    }
    return new AlertaSeguimiento({ ...this.props, estado, resueltaEn: ahora });
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get tipo(): TipoAlertaSeguimiento {
    return this.props.tipo;
  }
  get estado(): EstadoAlertaSeguimiento {
    return this.props.estado;
  }
  get referenciaId(): string | null {
    return this.props.referenciaId;
  }

  aPrimitivos(): PropiedadesAlertaSeguimiento {
    return { ...this.props, datos: this.props.datos ? { ...this.props.datos } : null };
  }
}
