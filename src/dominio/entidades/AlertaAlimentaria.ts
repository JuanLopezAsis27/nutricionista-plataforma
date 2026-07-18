import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Tipos de alerta alimentaria. */
export const TIPOS_ALERTA_ALIMENTARIA = [
  "ALERGIA",
  "INTOLERANCIA",
  "RESTRICCION",
] as const;
export type TipoAlertaAlimentaria = (typeof TIPOS_ALERTA_ALIMENTARIA)[number];

/** Severidades posibles de una alerta. */
export const SEVERIDADES_ALERTA = ["LEVE", "MODERADA", "SEVERA"] as const;
export type SeveridadAlerta = (typeof SEVERIDADES_ALERTA)[number];

/** Datos para registrar una alerta nueva. */
export interface DatosNuevaAlertaAlimentaria {
  pacienteId: string;
  tipo: TipoAlertaAlimentaria;
  descripcion: string;
  severidad?: SeveridadAlerta;
  notas?: string | null;
}

/** Estado completo de una alerta persistida. */
export interface PropiedadesAlertaAlimentaria {
  id: string;
  pacienteId: string;
  tipo: TipoAlertaAlimentaria;
  descripcion: string;
  severidad: SeveridadAlerta;
  notas: string | null;
  creadoEn: Date;
}

/**
 * Entidad de dominio Alerta Alimentaria: alergia, intolerancia o restricción
 * del paciente. Se muestra destacada en toda su ficha para que ninguna
 * decisión nutricional la pase por alto.
 */
export class AlertaAlimentaria {
  private constructor(private readonly props: PropiedadesAlertaAlimentaria) {}

  static crear(
    datos: DatosNuevaAlertaAlimentaria,
    id: string,
    ahora: Date = new Date(),
  ): AlertaAlimentaria {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("La alerta debe pertenecer a un paciente.");
    }
    if (!TIPOS_ALERTA_ALIMENTARIA.includes(datos.tipo)) {
      throw new ErrorValidacion(`Tipo de alerta desconocido: ${datos.tipo}.`);
    }
    const severidad = datos.severidad ?? "MODERADA";
    if (!SEVERIDADES_ALERTA.includes(severidad)) {
      throw new ErrorValidacion(`Severidad desconocida: ${severidad}.`);
    }
    const descripcion = datos.descripcion?.trim() ?? "";
    if (descripcion.length === 0) {
      throw new ErrorValidacion("La alerta debe describir el alimento o condición.");
    }

    return new AlertaAlimentaria({
      id,
      pacienteId: datos.pacienteId,
      tipo: datos.tipo,
      descripcion,
      severidad,
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesAlertaAlimentaria): AlertaAlimentaria {
    return new AlertaAlimentaria(props);
  }

  /** Versión actualizada e inmutable (preserva id, paciente y creadoEn). */
  actualizar(
    cambios: Partial<Omit<DatosNuevaAlertaAlimentaria, "pacienteId">>,
  ): AlertaAlimentaria {
    const actualizada = AlertaAlimentaria.crear(
      {
        pacienteId: this.props.pacienteId,
        tipo: cambios.tipo ?? this.props.tipo,
        descripcion: cambios.descripcion ?? this.props.descripcion,
        severidad: cambios.severidad ?? this.props.severidad,
        notas: cambios.notas !== undefined ? cambios.notas : this.props.notas,
      },
      this.props.id,
      this.props.creadoEn,
    );
    return actualizada;
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get tipo(): TipoAlertaAlimentaria {
    return this.props.tipo;
  }
  get descripcion(): string {
    return this.props.descripcion;
  }
  get severidad(): SeveridadAlerta {
    return this.props.severidad;
  }
  get notas(): string | null {
    return this.props.notas;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesAlertaAlimentaria {
    return { ...this.props };
  }
}
