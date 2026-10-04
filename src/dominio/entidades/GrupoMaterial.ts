import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos para crear o renombrar una carpeta de la biblioteca. */
export interface DatosGrupoMaterial {
  nombre: string;
  descripcion?: string | null;
}

/** Estado completo de una carpeta persistida. */
export interface PropiedadesGrupoMaterial {
  id: string;
  nombre: string;
  descripcion: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio GrupoMaterial: una carpeta donde el profesional guarda
 * los materiales de su biblioteca agrupados como le sirva —por tema, por
 * etapa del tratamiento, por paciente—.
 *
 * Es la misma idea que `GrupoPlan` y `GrupoReceta`, y por los mismos motivos.
 * No reemplaza a la categoría ni a las etiquetas: esas describen el material,
 * la carpeta dice dónde lo guardó el profesional.
 *
 * Invariantes: nombre obligatorio y de largo razonable. La unicidad del nombre
 * por consultorio la verifica el caso de uso contra el repositorio, y la
 * sostiene un índice único (migración 87).
 */
export class GrupoMaterial {
  private constructor(private readonly props: PropiedadesGrupoMaterial) {}

  static crear(
    datos: DatosGrupoMaterial,
    id: string,
    ahora: Date = new Date(),
  ): GrupoMaterial {
    return new GrupoMaterial({
      id,
      nombre: nombreValido(datos.nombre),
      descripcion: datos.descripcion?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesGrupoMaterial): GrupoMaterial {
    return new GrupoMaterial(props);
  }

  /** Copia con los cambios aplicados (id y creadoEn intactos). */
  actualizar(
    datos: DatosGrupoMaterial,
    ahora: Date = new Date(),
  ): GrupoMaterial {
    return new GrupoMaterial({
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

  aPrimitivos(): PropiedadesGrupoMaterial {
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
