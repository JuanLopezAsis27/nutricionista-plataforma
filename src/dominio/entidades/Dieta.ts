import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Tipos de comida que componen una dieta. */
export const TIPOS_COMIDA = ["DESAYUNO", "ALMUERZO", "MERIENDA", "CENA"] as const;
export type TipoComida = (typeof TIPOS_COMIDA)[number];

/** Una comida dentro de una dieta. */
export interface PropiedadesComida {
  id: string;
  tipo: TipoComida;
  descripcion: string;
  calorias: number | null;
}

/** Datos para crear una comida nueva. */
export interface DatosNuevaComida {
  tipo: TipoComida;
  descripcion: string;
  calorias?: number | null;
}

/** Datos para crear una dieta nueva con sus comidas. */
export interface DatosNuevaDieta {
  nombre: string;
  descripcion?: string | null;
  comidas: DatosNuevaComida[];
}

/** Estado completo de una dieta persistida. */
export interface PropiedadesDieta {
  id: string;
  nombre: string;
  descripcion: string | null;
  comidas: PropiedadesComida[];
  creadoEn: Date;
}

/**
 * Entidad de dominio Dieta (raíz de agregado: contiene sus Comidas).
 *
 * Invariantes locales: nombre obligatorio, al menos una comida y calorías
 * no negativas. La regla "un paciente solo puede tener una dieta activa a
 * la vez" pertenece a la asignación y se valida en el caso de uso
 * AsignarDietaAPaciente.
 */
export class Dieta {
  private constructor(private readonly props: PropiedadesDieta) {}

  static crear(
    datos: DatosNuevaDieta,
    id: string,
    generarIdComida: () => string,
    ahora: Date = new Date(),
  ): Dieta {
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("El nombre de la dieta es obligatorio.");
    }
    if (!datos.comidas || datos.comidas.length === 0) {
      throw new ErrorValidacion("La dieta debe tener al menos una comida.");
    }

    const comidas: PropiedadesComida[] = datos.comidas.map((comida) => {
      const descripcion = comida.descripcion?.trim() ?? "";
      if (descripcion.length === 0) {
        throw new ErrorValidacion("Cada comida debe tener una descripción.");
      }
      if (comida.calorias != null && comida.calorias < 0) {
        throw new ErrorValidacion("Las calorías no pueden ser negativas.");
      }
      return {
        id: generarIdComida(),
        tipo: comida.tipo,
        descripcion,
        calorias: comida.calorias ?? null,
      };
    });

    return new Dieta({
      id,
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      comidas,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesDieta): Dieta {
    return new Dieta(props);
  }

  /** Suma de calorías de todas las comidas con valor informado. */
  get caloriasTotales(): number {
    return this.props.comidas.reduce((total, c) => total + (c.calorias ?? 0), 0);
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get descripcion(): string | null {
    return this.props.descripcion;
  }
  get comidas(): ReadonlyArray<PropiedadesComida> {
    return this.props.comidas;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesDieta {
    return { ...this.props, comidas: this.props.comidas.map((c) => ({ ...c })) };
  }
}
