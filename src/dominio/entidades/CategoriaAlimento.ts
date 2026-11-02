import { ErrorValidacion } from "../errores/ErrorValidacion";
import { normalizarTextoAlimento } from "./AlimentoPropio";

/** Largo máximo del nombre de una categoría: es un rótulo de filtro. */
export const LARGO_MAXIMO_NOMBRE_CATEGORIA = 60;

/**
 * La categoría que lleva un alimento: cuál es, cómo se llama y de qué lista
 * sale (migración 93).
 *
 * `propia` dice si es del CONSULTORIO (la creó el profesional) o una
 * PREDETERMINADA de la plataforma (la administra el SUPERADMIN). Las dos se
 * eligen y se filtran igual; la diferencia es quién la puede editar, y en qué
 * columna del alimento se guarda.
 */
export interface CategoriaDeAlimento {
  id: string;
  nombre: string;
  propia: boolean;
}

export interface DatosCategoriaAlimento {
  nombre: string;
  /** Solo las predeterminadas tienen orden; las propias van por nombre. */
  orden?: number;
}

export interface PropiedadesCategoriaAlimento {
  id: string;
  nombre: string;
  propia: boolean;
  orden: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio CategoriaAlimento: un rubro para ordenar y filtrar los
 * alimentos («Lácteos», «Geles deportivos»).
 *
 * Fue un enum hasta la migración 93. Pasó a ser una entidad porque dejó de
 * ser una lista fija: las predeterminadas las administra el SUPERADMIN y cada
 * consultorio suma las suyas. Son la misma cosa con otro dueño —como los
 * alimentos de la plataforma y los propios— y por eso una sola entidad sirve a
 * las dos tablas.
 *
 * Invariantes: nombre obligatorio y corto. La unicidad del nombre (sin
 * mayúsculas ni tildes, `claveNombre`) la verifica el caso de uso, y la
 * sostiene un índice único.
 */
export class CategoriaAlimento {
  private constructor(private readonly props: PropiedadesCategoriaAlimento) {}

  static crear(
    datos: DatosCategoriaAlimento,
    propia: boolean,
    id: string,
    ahora: Date = new Date(),
  ): CategoriaAlimento {
    return new CategoriaAlimento({
      id,
      nombre: nombreValido(datos.nombre),
      propia,
      orden: propia ? 0 : Math.max(0, Math.trunc(datos.orden ?? 0)),
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesCategoriaAlimento): CategoriaAlimento {
    return new CategoriaAlimento(props);
  }

  /** Copia con otro nombre (id, lista y orden intactos). */
  renombrar(nombre: string, ahora: Date = new Date()): CategoriaAlimento {
    return new CategoriaAlimento({
      ...this.props,
      nombre: nombreValido(nombre),
      actualizadoEn: ahora,
    });
  }

  /** Copia en otra posición de la lista (solo tiene sentido en las predeterminadas). */
  conOrden(orden: number): CategoriaAlimento {
    return new CategoriaAlimento({ ...this.props, orden });
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get propia(): boolean {
    return this.props.propia;
  }
  get orden(): number {
    return this.props.orden;
  }

  /**
   * El nombre comparable: sin mayúsculas, tildes ni espacios de más.
   * «Lácteos» y «lacteos » son la misma categoría.
   */
  get claveNombre(): string {
    return claveNombreCategoria(this.props.nombre);
  }

  /** Lo que guarda un alimento que la lleva. */
  get referencia(): CategoriaDeAlimento {
    return {
      id: this.props.id,
      nombre: this.props.nombre,
      propia: this.props.propia,
    };
  }

  aPrimitivos(): PropiedadesCategoriaAlimento {
    return { ...this.props };
  }
}

/** La clave de unicidad del nombre de una categoría. */
export function claveNombreCategoria(nombre: string): string {
  return normalizarTextoAlimento(nombre);
}

/**
 * La categoría que nombra un texto libre (la columna «Categoría» de una
 * planilla), o null si no nombra ninguna de las disponibles.
 *
 * Primero busca el nombre exacto (sin mayúsculas ni tildes, y en singular o
 * plural): así «Geles» va a la categoría propia «Geles» aunque exista la
 * predeterminada «Geles deportivos». Si no hay, acepta la PRIMERA palabra
 * («Pescados» → «Pescados y mariscos») y el código del viejo enum
 * («FRUTOS_SECOS»). Un texto que no reconoce no es un error: el alimento
 * entra sin categoría.
 */
export function categoriaDesdeTexto(
  texto: string | null | undefined,
  categorias: ReadonlyArray<CategoriaDeAlimento>,
): CategoriaDeAlimento | null {
  const buscado = singular(
    normalizarTextoAlimento((texto ?? "").replace(/_/g, " ")),
  );
  if (buscado === "") return null;

  const exacta = categorias.find(
    (c) => singular(normalizarTextoAlimento(c.nombre)) === buscado,
  );
  if (exacta) return exacta;

  return (
    categorias.find((c) => {
      const nombre = normalizarTextoAlimento(c.nombre);
      const primera = nombre.split(" ")[0] ?? "";
      return (
        singular(primera) === buscado ||
        // «frutos secos» (el código FRUTOS_SECOS) → «Frutos secos y semillas»
        (buscado.includes(" ") && nombre.startsWith(buscado))
      );
    }) ?? null
  );
}

/** Saca la «s» final: «lácteos» y «lácteo» se comparan igual. */
function singular(texto: string): string {
  return texto.replace(/s$/, "");
}

function nombreValido(nombre: string | undefined): string {
  const limpio = (nombre ?? "").trim().replace(/\s+/g, " ");
  if (limpio.length === 0) {
    throw new ErrorValidacion("La categoría debe tener un nombre.");
  }
  if (limpio.length > LARGO_MAXIMO_NOMBRE_CATEGORIA) {
    throw new ErrorValidacion(
      `El nombre de la categoría no puede superar los ${LARGO_MAXIMO_NOMBRE_CATEGORIA} caracteres.`,
    );
  }
  return limpio;
}
