import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Estado de un alimento propio (macros por 100 g). */
export interface PropiedadesAlimentoPropio {
  id: string;
  nombre: string;
  marca: string | null;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
}

/** Datos para crear un alimento propio (desde una fila del Excel/CSV). */
export interface DatosNuevoAlimentoPropio {
  nombre: string;
  marca?: string | null;
  caloriasPor100?: number | null;
  proteinasPor100?: number | null;
  carbohidratosPor100?: number | null;
  grasasPor100?: number | null;
}

/**
 * Entidad de dominio AlimentoPropio: un alimento/insumo que el nutricionista
 * cargó desde su propia planilla, con macros por 100 g. Reemplaza a FatSecret
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
    });
  }

  static reconstruir(props: PropiedadesAlimentoPropio): AlimentoPropio {
    return new AlimentoPropio(props);
  }

  /** Nombre en minúsculas/trim, para la búsqueda case-insensitive. */
  get nombreNormalizado(): string {
    return this.props.nombre.trim().toLowerCase();
  }

  aPrimitivos(): PropiedadesAlimentoPropio {
    return { ...this.props };
  }
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
