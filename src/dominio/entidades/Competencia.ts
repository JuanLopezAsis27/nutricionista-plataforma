import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Importancia de la competencia (planificación por picos):
 * A = objetivo principal, B = secundaria, C = preparatoria/control.
 */
export const IMPORTANCIAS_COMPETENCIA = ["A", "B", "C"] as const;
export type ImportanciaCompetencia = (typeof IMPORTANCIAS_COMPETENCIA)[number];

/** Datos para crear/editar una competencia del calendario del deportista. */
export interface DatosCompetencia {
  pacienteId: string;
  nombre: string;
  fecha: Date;
  lugar?: string | null;
  objetivo?: string | null;
  resultado?: string | null;
  importancia?: ImportanciaCompetencia;
  notas?: string | null;
}

/** Estado completo de una competencia persistida. */
export interface PropiedadesCompetencia {
  id: string;
  pacienteId: string;
  nombre: string;
  fecha: Date;
  lugar: string | null;
  objetivo: string | null;
  resultado: string | null;
  importancia: ImportanciaCompetencia;
  notas: string | null;
  creadoEn: Date;
}

/**
 * Entidad de dominio Competencia: un evento del calendario deportivo del
 * paciente (carrera, torneo, pelea). Permite planificar la nutrición según las
 * fechas y su importancia. El resultado se completa después del evento.
 *
 * Invariantes: paciente, nombre y fecha obligatorios; importancia A/B/C.
 */
export class Competencia {
  private constructor(private readonly props: PropiedadesCompetencia) {}

  static crear(
    datos: DatosCompetencia,
    id: string,
    ahora: Date = new Date(),
  ): Competencia {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion(
        "La competencia debe pertenecer a un paciente.",
      );
    }
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("La competencia debe tener un nombre.");
    }
    if (!(datos.fecha instanceof Date) || Number.isNaN(datos.fecha.getTime())) {
      throw new ErrorValidacion("La competencia debe tener una fecha válida.");
    }
    const importancia = datos.importancia ?? "B";
    if (!IMPORTANCIAS_COMPETENCIA.includes(importancia)) {
      throw new ErrorValidacion("La importancia debe ser A, B o C.");
    }

    return new Competencia({
      id,
      pacienteId: datos.pacienteId,
      nombre,
      fecha: datos.fecha,
      lugar: datos.lugar?.trim() || null,
      objetivo: datos.objetivo?.trim() || null,
      resultado: datos.resultado?.trim() || null,
      importancia,
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesCompetencia): Competencia {
    return new Competencia(props);
  }

  /** Versión actualizada e inmutable (preserva id, paciente y creadoEn). */
  actualizar(cambios: Omit<DatosCompetencia, "pacienteId">): Competencia {
    const actualizada = Competencia.crear(
      { ...cambios, pacienteId: this.props.pacienteId },
      this.props.id,
    );
    return new Competencia({
      ...actualizada.props,
      creadoEn: this.props.creadoEn,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }

  aPrimitivos(): PropiedadesCompetencia {
    return { ...this.props };
  }
}
