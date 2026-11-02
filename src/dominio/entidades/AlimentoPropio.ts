import { ErrorValidacion } from "../errores/ErrorValidacion";
import {
  normalizarMedidas,
  type MedidaAlimento,
  type UnidadBaseAlimento,
} from "./medidasAlimento";
import type { CategoriaDeAlimento } from "./CategoriaAlimento";

/** Formatos de imagen que acepta un alimento, y su extensión en el bucket. */
export const FORMATOS_IMAGEN_ALIMENTO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Tope del PESO de la imagen que se sube (a mano o dentro de un Excel): es una
 * miniatura, no una foto. Lo que se guarda pesa mucho menos: ver
 * `LADO_MAXIMO_IMAGEN_ALIMENTO`.
 */
export const TAMANO_MAXIMO_IMAGEN_ALIMENTO = 2 * 1024 * 1024;

/**
 * Tope del TAMAÑO con que se guarda: cada imagen se reduce hasta entrar en un
 * cuadrado de este lado (sin agrandar las chicas) y se guarda en WebP. Una
 * foto de celular de 3 MB queda en unos 30-60 KB: el buscador muestra decenas
 * a la vez, y la imagen original no aporta nada a una miniatura.
 */
export const LADO_MAXIMO_IMAGEN_ALIMENTO = 512;

/**
 * Tope de píxeles de la imagen de ENTRADA (ancho × alto). Corta las imágenes
 * enormes antes de descomprimirlas: un PNG de pocos KB puede declarar 50.000
 * × 50.000 píxeles y ocupar gigas en memoria al abrirse. 24 MP cubre la foto
 * de cualquier celular.
 */
export const PIXELES_MAXIMOS_IMAGEN_ALIMENTO = 24_000_000;

/** Largo máximo de la descripción de un alimento: es una ficha, no un artículo. */
export const LARGO_MAXIMO_DESCRIPCION_ALIMENTO = 1000;

/**
 * Tope de la cafeína por 100 g/ml (migración 95). Un gel con cafeína anda en
 * 100-300 mg/100 g y el café molido en 1200; el tope deja pasar un suplemento
 * de cafeína concentrada sin aceptar un error de tipeo de seis cifras.
 */
export const CAFEINA_MAXIMA_POR_100 = 99_999;

/** Estado de un alimento propio (macros por 100 g o por 100 ml). */
export interface PropiedadesAlimentoPropio {
  id: string;
  nombre: string;
  marca: string | null;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
  /**
   * Miligramos de cafeína por 100 g (o por 100 ml), como los macros
   * (migración 95). Null es sin dato, no 0.
   */
  cafeinaPor100: number | null;
  /** Texto libre: qué es, cómo se toma, qué trae (migración 95). */
  descripcion: string | null;
  /** Si los macros son por 100 g o por 100 ml (migración 90). */
  unidadBase: UnidadBaseAlimento;
  /** Medidas caseras propias: «1 taza = 240» en la unidad base. */
  medidas: MedidaAlimento[];
  /**
   * Predeterminada de la plataforma o propia del consultorio (migración 93).
   * Un alimento de la plataforma solo lleva predeterminadas: lo verifica el
   * caso de uso, que es el que sabe de qué lista es.
   */
  categoria: CategoriaDeAlimento | null;
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
  /** mg por 100 g/ml (migración 95). */
  cafeinaPor100?: number | null;
  descripcion?: string | null;
  /** Por defecto GRAMO. */
  unidadBase?: UnidadBaseAlimento | null;
  medidas?: ReadonlyArray<MedidaAlimento> | null;
  categoria?: CategoriaDeAlimento | null;
}

/**
 * Entidad de dominio AlimentoPropio: un alimento/insumo que el nutricionista
 * cargó desde su propia planilla, con macros por 100 g (o por 100 ml si es un
 * líquido) y sus medidas caseras (`medidasAlimento.ts`, migración 90). Reemplaza a la búsqueda externa
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
      cafeinaPor100: cafeina(datos.cafeinaPor100),
      descripcion: descripcion(datos.descripcion),
      unidadBase: datos.unidadBase ?? "GRAMO",
      medidas: normalizarMedidas(datos.medidas, nombre),
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
        cafeinaPor100: fusionar(
          cambios.cafeinaPor100,
          this.props.cafeinaPor100,
        ),
        descripcion: fusionar(cambios.descripcion, this.props.descripcion),
        unidadBase: fusionar(cambios.unidadBase, this.props.unidadBase),
        medidas: fusionar(cambios.medidas, this.props.medidas),
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
    return { ...this.props, medidas: [...this.props.medidas] };
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

/** Cafeína en mg por 100 g/ml: no negativa y con un tope razonable. */
function cafeina(valor: number | null | undefined): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErrorValidacion("La cafeína no puede ser negativa.");
  }
  if (valor > CAFEINA_MAXIMA_POR_100) {
    throw new ErrorValidacion(
      "La cafeína va en miligramos por 100 g (o 100 ml): el valor es demasiado alto.",
    );
  }
  return Math.round(valor * 100) / 100;
}

function descripcion(valor: string | null | undefined): string | null {
  const limpio = limpiarTexto(valor);
  if (limpio && limpio.length > LARGO_MAXIMO_DESCRIPCION_ALIMENTO) {
    throw new ErrorValidacion(
      `La descripción del alimento no puede superar los ${LARGO_MAXIMO_DESCRIPCION_ALIMENTO} caracteres.`,
    );
  }
  return limpio;
}
