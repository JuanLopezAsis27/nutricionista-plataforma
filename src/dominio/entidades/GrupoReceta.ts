import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos para crear o renombrar una carpeta de recetas. */
export interface DatosGrupoReceta {
  nombre: string;
  descripcion?: string | null;
}

/** Estado completo de una carpeta persistida. */
export interface PropiedadesGrupoReceta {
  id: string;
  nombre: string;
  descripcion: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio GrupoReceta: una carpeta donde el profesional guarda sus
 * recetas agrupadas como le sirva —por comida, por restricción, por paciente—.
 *
 * Es la misma idea que `GrupoPlan` y por los mismos motivos: el recetario deja
 * de alcanzar como una sola bolsa cuando pasa de veinte recetas, y el criterio
 * lo pone quien trabaja, no el sistema.
 *
 * **No reemplaza a las etiquetas.** Una receta tiene MUCHAS etiquetas —es a la
 * vez «vegetariana» y «rápida»— y está en UNA carpeta: la etiqueta describe la
 * receta, la carpeta dice dónde la guardó el profesional. Las dos cosas conviven
 * y el filtro por etiqueta sigue funcionando adentro de una carpeta.
 *
 * Invariantes: nombre obligatorio y de largo razonable. La unicidad del nombre
 * por consultorio la verifica el caso de uso contra el repositorio, y la
 * sostiene un índice único (migración 41).
 */
export class GrupoReceta {
  private constructor(private readonly props: PropiedadesGrupoReceta) {}

  static crear(
    datos: DatosGrupoReceta,
    id: string,
    ahora: Date = new Date(),
  ): GrupoReceta {
    return new GrupoReceta({
      id,
      nombre: nombreValido(datos.nombre),
      descripcion: datos.descripcion?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesGrupoReceta): GrupoReceta {
    return new GrupoReceta(props);
  }

  /** Copia con los cambios aplicados (id y creadoEn intactos). */
  actualizar(datos: DatosGrupoReceta, ahora: Date = new Date()): GrupoReceta {
    return new GrupoReceta({
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

  aPrimitivos(): PropiedadesGrupoReceta {
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
