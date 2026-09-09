import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Origen de una métrica de dispositivo (wearable). */
export const FUENTES_METRICA = [
  "APPLE_WATCH",
  "HEALTH_CONNECT",
  "MANUAL",
] as const;
export type FuenteMetrica = (typeof FUENTES_METRICA)[number];

export interface DatosMetricaDispositivo {
  pacienteId: string;
  fecha: Date;
  fuente: FuenteMetrica;
  pasos?: number | null;
  minutosActividad?: number | null;
  caloriasActivas?: number | null;
  frecuenciaCardiacaReposo?: number | null;
  horasSueno?: number | null;
  incluir?: boolean;
}

export interface PropiedadesMetricaDispositivo {
  id: string;
  pacienteId: string;
  fecha: Date;
  fuente: FuenteMetrica;
  pasos: number | null;
  minutosActividad: number | null;
  caloriasActivas: number | null;
  frecuenciaCardiacaReposo: number | null;
  horasSueno: number | null;
  /** El paciente decide por día si este registro cuenta para su seguimiento. */
  incluir: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio MetricaDispositivo: los datos diarios que un wearable
 * (Apple Watch / Health Connect) aporta para un paciente. El opt-in por día
 * (`incluir`) permite que el paciente elija qué días cuentan para su
 * seguimiento. Invariantes: valores no negativos; sueño 0–24 h.
 */
export class MetricaDispositivo {
  private constructor(private readonly props: PropiedadesMetricaDispositivo) {}

  static crear(
    datos: DatosMetricaDispositivo,
    id: string,
    ahora: Date = new Date(),
  ): MetricaDispositivo {
    if (!datos.pacienteId) {
      throw new ErrorValidacion("La métrica debe tener un paciente.");
    }
    const pasos = enteroNoNegativo(datos.pasos, "Los pasos", 200000);
    const minutosActividad = enteroNoNegativo(
      datos.minutosActividad,
      "Los minutos de actividad",
      1440,
    );
    const caloriasActivas = enteroNoNegativo(
      datos.caloriasActivas,
      "Las calorías activas",
      20000,
    );
    const fc = enteroNoNegativo(
      datos.frecuenciaCardiacaReposo,
      "La frecuencia cardíaca",
      250,
    );
    const horasSueno = horas(datos.horasSueno);

    return new MetricaDispositivo({
      id,
      pacienteId: datos.pacienteId,
      fecha: datos.fecha,
      fuente: datos.fuente,
      pasos,
      minutosActividad,
      caloriasActivas,
      frecuenciaCardiacaReposo: fc,
      horasSueno,
      incluir: datos.incluir ?? true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesMetricaDispositivo): MetricaDispositivo {
    return new MetricaDispositivo(props);
  }

  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get fecha(): Date {
    return this.props.fecha;
  }
  get fuente(): FuenteMetrica {
    return this.props.fuente;
  }
  get incluir(): boolean {
    return this.props.incluir;
  }

  aPrimitivos(): PropiedadesMetricaDispositivo {
    return { ...this.props };
  }
}

function enteroNoNegativo(
  valor: number | null | undefined,
  etiqueta: string,
  maximo: number,
): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0 || valor > maximo) {
    throw new ErrorValidacion(`${etiqueta} tiene un valor inválido.`);
  }
  return Math.round(valor);
}

function horas(valor: number | null | undefined): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0 || valor > 24) {
    throw new ErrorValidacion("Las horas de sueño deben estar entre 0 y 24.");
  }
  return Math.round(valor * 10) / 10;
}
