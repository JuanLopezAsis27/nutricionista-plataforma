import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Rubros de un alimento (migración 84), en el orden en que se ofrecen como
 * filtro. Lista FIJA y no etiquetas libres: es lo que se filtra en el
 * buscador de todos los consultorios, y con texto libre «Lácteos», «lacteos»
 * y «Lácteo» serían tres filtros. Los valores solo se agregan (son un enum de
 * la base).
 */
export const CATEGORIAS_ALIMENTO = [
  "CARNES",
  // Migración 86. En la base quedó al final del enum (solo se agrega); acá va
  // junto a las carnes, que es donde se lo busca.
  "EMBUTIDOS",
  "PESCADOS",
  "HUEVOS",
  "LACTEOS",
  "CEREALES",
  "LEGUMBRES",
  "VERDURAS",
  "FRUTAS",
  "FRUTOS_SECOS",
  "ACEITES_GRASAS",
  "AZUCARES_DULCES",
  "BEBIDAS",
  "SUPLEMENTOS",
  "OTROS",
] as const;
export type CategoriaAlimento = (typeof CATEGORIAS_ALIMENTO)[number];

/** Cómo se lee cada categoría en pantalla y en la planilla. */
export const NOMBRES_CATEGORIA_ALIMENTO: Record<CategoriaAlimento, string> = {
  CARNES: "Carnes",
  EMBUTIDOS: "Embutidos",
  PESCADOS: "Pescados y mariscos",
  HUEVOS: "Huevos",
  LACTEOS: "Lácteos",
  CEREALES: "Cereales y derivados",
  LEGUMBRES: "Legumbres",
  VERDURAS: "Verduras",
  FRUTAS: "Frutas",
  FRUTOS_SECOS: "Frutos secos y semillas",
  ACEITES_GRASAS: "Aceites y grasas",
  AZUCARES_DULCES: "Azúcares y dulces",
  BEBIDAS: "Bebidas",
  SUPLEMENTOS: "Suplementos",
  OTROS: "Otros",
};

/**
 * La categoría que nombra un texto libre (la columna «Categoría» de una
 * planilla), o null si no nombra ninguna. Acepta el nombre en pantalla
 * («Lácteos»), el código («LACTEOS»), su primera palabra («Pescados») y el
 * singular («lácteo», «fruta»), sin mayúsculas ni tildes. Un texto que no
 * reconoce no es un error: el alimento entra sin categoría.
 */
export function categoriaDesdeTexto(
  texto: string | null | undefined,
): CategoriaAlimento | null {
  const buscado = normalizarTextoAlimento(texto).replace(/s$/, "");
  if (buscado === "") return null;
  return (
    CATEGORIAS_ALIMENTO.find((categoria) => {
      const nombre = normalizarTextoAlimento(
        NOMBRES_CATEGORIA_ALIMENTO[categoria],
      );
      const codigo = normalizarTextoAlimento(categoria.replace(/_/g, " "));
      const primera = nombre.split(" ")[0] ?? "";
      return [nombre, codigo, primera].some(
        (candidato) => candidato.replace(/s$/, "") === buscado,
      );
    }) ?? null
  );
}

/** Formatos de imagen que acepta un alimento, y su extensión en el bucket. */
export const FORMATOS_IMAGEN_ALIMENTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Tope del tamaño de la imagen de un alimento: es una miniatura, no una foto. */
export const TAMANO_MAXIMO_IMAGEN_ALIMENTO = 2 * 1024 * 1024;

/** Estado de un alimento propio (macros por 100 g). */
export interface PropiedadesAlimentoPropio {
  id: string;
  nombre: string;
  marca: string | null;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
  categoria: CategoriaAlimento | null;
  /** Clave en el bucket de su imagen, o null si no tiene. */
  imagenClave: string | null;
}

/** Datos para crear un alimento propio (desde una fila del Excel/CSV). */
export interface DatosNuevoAlimentoPropio {
  nombre: string;
  marca?: string | null;
  caloriasPor100?: number | null;
  proteinasPor100?: number | null;
  carbohidratosPor100?: number | null;
  grasasPor100?: number | null;
  categoria?: CategoriaAlimento | null;
}

/**
 * Entidad de dominio AlimentoPropio: un alimento/insumo que el nutricionista
 * cargó desde su propia planilla, con macros por 100 g. Reemplaza a la búsqueda externa
 * cuando el inquilino tiene una lista cargada. TypeScript puro (sin Prisma).
 *
 * Invariantes: nombre obligatorio; macros no negativas (si vienen).
 */
export class AlimentoPropio {
  private constructor(private readonly props: PropiedadesAlimentoPropio) {}

  static crear(datos: DatosNuevoAlimentoPropio, id: string): AlimentoPropio {
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("El alimento debe tener un nombre.");
    }
    return new AlimentoPropio({
      id,
      nombre,
      marca: limpiarTexto(datos.marca),
      caloriasPor100: macro(datos.caloriasPor100, "calorías"),
      proteinasPor100: macro(datos.proteinasPor100, "proteínas"),
      carbohidratosPor100: macro(datos.carbohidratosPor100, "carbohidratos"),
      grasasPor100: macro(datos.grasasPor100, "grasas"),
      categoria: datos.categoria ?? null,
      // La imagen no viene en los datos: se sube aparte (`conImagen`), porque
      // un alimento nuevo no tiene id hasta que existe.
      imagenClave: null,
    });
  }

  static reconstruir(props: PropiedadesAlimentoPropio): AlimentoPropio {
    return new AlimentoPropio(props);
  }

  /** Copia con los cambios aplicados y validados (id intacto). */
  actualizar(cambios: Partial<DatosNuevoAlimentoPropio>): AlimentoPropio {
    const fusionar = <T>(nuevo: T | undefined, actual: T): T =>
      nuevo !== undefined ? nuevo : actual;

    return AlimentoPropio.crear(
      {
        nombre: cambios.nombre ?? this.props.nombre,
        marca: fusionar(cambios.marca, this.props.marca),
        caloriasPor100: fusionar(
          cambios.caloriasPor100,
          this.props.caloriasPor100,
        ),
        proteinasPor100: fusionar(
          cambios.proteinasPor100,
          this.props.proteinasPor100,
        ),
        carbohidratosPor100: fusionar(
          cambios.carbohidratosPor100,
          this.props.carbohidratosPor100,
        ),
        grasasPor100: fusionar(cambios.grasasPor100, this.props.grasasPor100),
        categoria: fusionar(cambios.categoria, this.props.categoria),
      },
      this.props.id,
    ).conImagen(this.props.imagenClave);
  }

  /** Copia con otra imagen (o sin imagen, con null). */
  conImagen(imagenClave: string | null): AlimentoPropio {
    return new AlimentoPropio({ ...this.props, imagenClave });
  }

  get imagenClave(): string | null {
    return this.props.imagenClave;
  }

  /**
   * Una marca que cambia con cada imagen nueva, para la URL de la imagen: la
   * ruta del alimento es siempre la misma, y sin esto el navegador mostraría
   * la imagen vieja de su caché. Sale del nombre del objeto, que es único por
   * subida.
   */
  get imagenVersion(): string | null {
    if (!this.props.imagenClave) return null;
    const archivo = this.props.imagenClave.split("/").pop() ?? "";
    return archivo.split(".")[0] || null;
  }

  get id(): string {
    return this.props.id;
  }

  /** Nombre en minúsculas/trim, para la búsqueda case-insensitive. */
  get nombreNormalizado(): string {
    return this.props.nombre.trim().toLowerCase();
  }

  /**
   * Qué hace que dos alimentos sean EL MISMO (migración 83): nombre y marca,
   * sin distinguir mayúsculas, tildes ni espacios de más. «Leche Descremada»
   * y «leche  descremada» son uno; la misma leche de dos marcas son dos,
   * porque sus macros no tienen por qué coincidir.
   *
   * La base la hace única (por consultorio en la lista propia, global en el
   * catálogo de la plataforma), así que cambiar esta regla pide una migración
   * que recalcule la columna.
   */
  get claveIdentidad(): string {
    return claveIdentidadAlimento(this.props.nombre, this.props.marca);
  }

  /** Nombre y marca para mostrar en un mensaje: «Avena (Quaker)». */
  get etiqueta(): string {
    return this.props.marca
      ? `${this.props.nombre} (${this.props.marca})`
      : this.props.nombre;
  }

  aPrimitivos(): PropiedadesAlimentoPropio {
    return { ...this.props };
  }
}

/**
 * Texto comparable: sin tildes (NFD + quitar marcas), en minúsculas y con los
 * espacios colapsados. La ñ queda como n: «Ñoquis» y «noquis» son el mismo.
 */
export function normalizarTextoAlimento(
  texto: string | null | undefined,
): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** La clave de identidad de un alimento. Ver `AlimentoPropio.claveIdentidad`. */
export function claveIdentidadAlimento(
  nombre: string,
  marca: string | null | undefined,
): string {
  return `${normalizarTextoAlimento(nombre)}|${normalizarTextoAlimento(marca)}`;
}

function limpiarTexto(valor: string | null | undefined): string | null {
  const limpio = valor?.trim() ?? "";
  return limpio === "" ? null : limpio;
}

function macro(
  valor: number | null | undefined,
  etiqueta: string,
): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErrorValidacion(`El valor de ${etiqueta} no puede ser negativo.`);
  }
  return Math.round(valor * 10) / 10;
}
