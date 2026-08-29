import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos para crear o renombrar una carpeta de planes. */
export interface DatosGrupoPlan {
  nombre: string;
  descripcion?: string | null;
}

/** Estado completo de una carpeta persistida. */
export interface PropiedadesGrupoPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio GrupoPlan: una carpeta donde el profesional guarda sus
 * planes agrupados por PROPÓSITO —un paciente, un objetivo, una población—.
 *
 * El criterio no lo fija el sistema: un consultorio agrupa por paciente y otro
 * por objetivo, y las dos cosas responden a la misma necesidad, que la lista de
 * planes deje de ser una sola bolsa cuando pasa de veinte.
 *
 * Invariantes: nombre obligatorio y de largo razonable. La unicidad del nombre
 * por consultorio la verifica el caso de uso contra el repositorio, y la
 * sostiene un índice único (migración 38).
 */
export class GrupoPlan {
  private constructor(private readonly props: PropiedadesGrupoPlan) {}

  static crear(
    datos: DatosGrupoPlan,
    id: string,
    ahora: Date = new Date(),
  ): GrupoPlan {
    return new GrupoPlan({
      id,
      nombre: nombreValido(datos.nombre),
      descripcion: datos.descripcion?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesGrupoPlan): GrupoPlan {
    return new GrupoPlan(props);
  }

  /** Copia con los cambios aplicados (id y creadoEn intactos). */
  actualizar(datos: DatosGrupoPlan, ahora: Date = new Date()): GrupoPlan {
    return new GrupoPlan({
      ...this.props,
      nombre: nombreValido(datos.nombre),
      descripcion: datos.descripcion?.trim() || null,
      actualizadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }

  aPrimitivos(): PropiedadesGrupoPlan {
    return { ...this.props };
  }
}

function nombreValido(nombre: string | undefined): string {
  const limpio = nombre?.trim() ?? "";
  if (limpio.length === 0) {
    throw new ErrorValidacion("La carpeta debe tener un nombre.");
  }
  if (limpio.length > 80) {
    throw new ErrorValidacion(
      "El nombre de la carpeta no puede superar los 80 caracteres.",
    );
  }
  return limpio;
}
