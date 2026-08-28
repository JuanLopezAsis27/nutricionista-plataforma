import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Prioridades de un objetivo. */
export const PRIORIDADES_OBJETIVO = ["ALTA", "MEDIA", "BAJA"] as const;
export type PrioridadObjetivo = (typeof PRIORIDADES_OBJETIVO)[number];

/** Estados de un objetivo. */
export const ESTADOS_OBJETIVO = ["EN_CURSO", "CUMPLIDO", "ABANDONADO"] as const;
export type EstadoObjetivo = (typeof ESTADOS_OBJETIVO)[number];

/** Estados de una estrategia. */
export const ESTADOS_ESTRATEGIA = ["ACTIVA", "LOGRADA", "DESCARTADA"] as const;
export type EstadoEstrategia = (typeof ESTADOS_ESTRATEGIA)[number];

/** Tipos de evento del historial (auditoría del objetivo). */
export const TIPOS_EVENTO_OBJETIVO = [
  "CREACION",
  "ACTUALIZACION",
  "CAMBIO_ESTADO",
  "ESTRATEGIA_AGREGADA",
  "ESTRATEGIA_CAMBIO_ESTADO",
  "ESTRATEGIA_ELIMINADA",
] as const;
export type TipoEventoObjetivo = (typeof TIPOS_EVENTO_OBJETIVO)[number];

/** Estrategia concreta para alcanzar el objetivo (hijo del agregado). */
export interface EstrategiaObjetivo {
  id: string;
  descripcion: string;
  motivo: string;
  estado: EstadoEstrategia;
  creadoEn: Date;
}

/** Evento del historial (lo persiste el repositorio junto con cada cambio). */
export interface EventoObjetivo {
  id: string;
  tipo: TipoEventoObjetivo;
  detalle: string;
  motivo: string | null;
  creadoEn: Date;
}

/** Datos para crear un objetivo nuevo. */
export interface DatosNuevoObjetivo {
  pacienteId: string;
  titulo: string;
  descripcion?: string | null;
  prioridad?: PrioridadObjetivo;
  fechaObjetivo?: Date | null;
  /**
   * Meta numérica que este plan busca alcanzar, si la hay.
   *
   * Los dos objetivos son complementarios: este es el PLAN (qué se hace y por
   * qué, con sus estrategias) y el de composición es el RESULTADO medible.
   * Vinculados, el plan muestra progreso real en vez de autoevaluación. Sigue
   * siendo opcional: hay planes sin número ("ordenar las cenas") y metas sin
   * plan escrito.
   */
  objetivoComposicionId?: string | null;
}

/** Cambios editables de un objetivo (el estado se cambia aparte, con motivo). */
export interface CambiosObjetivo {
  titulo?: string;
  descripcion?: string | null;
  prioridad?: PrioridadObjetivo;
  fechaObjetivo?: Date | null;
  /** null desvincula la meta numérica; undefined deja el vínculo como está. */
  objetivoComposicionId?: string | null;
}

/** Estado completo de un objetivo persistido. */
export interface PropiedadesObjetivo {
  id: string;
  pacienteId: string;
  objetivoComposicionId: string | null;
  titulo: string;
  descripcion: string | null;
  prioridad: PrioridadObjetivo;
  estado: EstadoObjetivo;
  fechaObjetivo: Date | null;
  estrategias: EstrategiaObjetivo[];
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio Objetivo (raíz de agregado: contiene sus Estrategias).
 *
 * Reglas: título obligatorio; el estado solo cambia vía cambiarEstado()
 * (los casos de uso exigen un motivo y escriben el historial); cada
 * estrategia lleva un motivo OBLIGATORIO que documenta por qué el
 * profesional la eligió.
 */
export class Objetivo {
  private constructor(private readonly props: PropiedadesObjetivo) {}

  static crear(datos: DatosNuevoObjetivo, id: string, ahora: Date = new Date()): Objetivo {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("El objetivo debe pertenecer a un paciente.");
    }
    const titulo = datos.titulo?.trim() ?? "";
    if (titulo.length === 0) {
      throw new ErrorValidacion("El objetivo debe tener un título.");
    }
    validarFecha(datos.fechaObjetivo);

    return new Objetivo({
      id,
      pacienteId: datos.pacienteId,
      objetivoComposicionId: datos.objetivoComposicionId?.trim() || null,
      titulo,
      descripcion: datos.descripcion?.trim() || null,
      prioridad: datos.prioridad ?? "MEDIA",
      estado: "EN_CURSO",
      fechaObjetivo: datos.fechaObjetivo ?? null,
      estrategias: [],
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesObjetivo): Objetivo {
    return new Objetivo(props);
  }

  /** Versión actualizada e inmutable (preserva estado, estrategias y creadoEn). */
  actualizar(cambios: CambiosObjetivo, ahora: Date = new Date()): Objetivo {
    const titulo = cambios.titulo !== undefined ? cambios.titulo.trim() : this.props.titulo;
    if (titulo.length === 0) {
      throw new ErrorValidacion("El objetivo debe tener un título.");
    }
    if (cambios.fechaObjetivo !== undefined) {
      validarFecha(cambios.fechaObjetivo);
    }

    return new Objetivo({
      ...this.props,
      titulo,
      descripcion:
        cambios.descripcion !== undefined
          ? cambios.descripcion?.trim() || null
          : this.props.descripcion,
      prioridad: cambios.prioridad ?? this.props.prioridad,
      fechaObjetivo:
        cambios.fechaObjetivo !== undefined ? cambios.fechaObjetivo : this.props.fechaObjetivo,
      objetivoComposicionId:
        cambios.objetivoComposicionId !== undefined
          ? cambios.objetivoComposicionId?.trim() || null
          : this.props.objetivoComposicionId,
      estrategias: this.props.estrategias.map((e) => ({ ...e })),
      actualizadoEn: ahora,
    });
  }

  /** Transición de estado (los casos de uso exigen motivo y auditan). */
  cambiarEstado(nuevo: EstadoObjetivo, ahora: Date = new Date()): Objetivo {
    if (nuevo === this.props.estado) {
      throw new ErrorValidacion(`El objetivo ya está en estado ${nuevo}.`);
    }
    return new Objetivo({
      ...this.props,
      estado: nuevo,
      estrategias: this.props.estrategias.map((e) => ({ ...e })),
      actualizadoEn: ahora,
    });
  }

  /**
   * Crea una estrategia validada. El motivo es OBLIGATORIO: documenta por
   * qué se eligió esta estrategia para este paciente.
   */
  static crearEstrategia(
    datos: { descripcion: string; motivo: string },
    id: string,
    ahora: Date = new Date(),
  ): EstrategiaObjetivo {
    const descripcion = datos.descripcion?.trim() ?? "";
    if (descripcion.length === 0) {
      throw new ErrorValidacion("La estrategia debe tener una descripción.");
    }
    const motivo = datos.motivo?.trim() ?? "";
    if (motivo.length === 0) {
      throw new ErrorValidacion(
        "La estrategia debe tener un motivo: por qué se eligió para este paciente.",
      );
    }
    return { id, descripcion, motivo, estado: "ACTIVA", creadoEn: ahora };
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get objetivoComposicionId(): string | null {
    return this.props.objetivoComposicionId;
  }
  get titulo(): string {
    return this.props.titulo;
  }
  get estado(): EstadoObjetivo {
    return this.props.estado;
  }
  get prioridad(): PrioridadObjetivo {
    return this.props.prioridad;
  }
  get estrategias(): ReadonlyArray<EstrategiaObjetivo> {
    return this.props.estrategias;
  }

  aPrimitivos(): PropiedadesObjetivo {
    return { ...this.props, estrategias: this.props.estrategias.map((e) => ({ ...e })) };
  }
}

function validarFecha(fecha: Date | null | undefined): void {
  if (fecha != null && (!(fecha instanceof Date) || Number.isNaN(fecha.getTime()))) {
    throw new ErrorValidacion("La fecha del objetivo no es válida.");
  }
}
