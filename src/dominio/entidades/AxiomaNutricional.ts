import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Ámbito de un axioma (contra qué dato del paciente se mide). */
export const AMBITOS_AXIOMA = [
  "SUENO",
  "HIDRATACION",
  "ACTIVIDAD",
  "PESO",
  "MACRO",
  "GENERAL",
] as const;
export type AmbitoAxioma = (typeof AMBITOS_AXIOMA)[number];

/** Cómo se evalúa el valor del paciente respecto del axioma. */
export const OPERADORES_AXIOMA = [
  "MAYOR_IGUAL",
  "MENOR_IGUAL",
  "ENTRE",
  "INFORMATIVO",
] as const;
export type OperadorAxioma = (typeof OPERADORES_AXIOMA)[number];

/** Operadores que exigen un umbral numérico. */
const OPERADORES_NUMERICOS: ReadonlySet<OperadorAxioma> = new Set([
  "MAYOR_IGUAL",
  "MENOR_IGUAL",
  "ENTRE",
]);

/** Datos para crear o editar un axioma. */
export interface DatosNuevoAxioma {
  ambito: AmbitoAxioma;
  parametro: string;
  operador: OperadorAxioma;
  valor?: number | null;
  valorMax?: number | null;
  unidad?: string | null;
  texto: string;
  prioridad?: number;
  activo?: boolean;
}

/** Estado completo persistido. */
export interface PropiedadesAxioma {
  id: string;
  ambito: AmbitoAxioma;
  parametro: string;
  operador: OperadorAxioma;
  valor: number | null;
  valorMax: number | null;
  unidad: string | null;
  texto: string;
  prioridad: number;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio AxiomaNutricional: regla de conocimiento que el
 * nutricionista carga sobre el comportamiento óptimo (ej. "dormir 7–9 h es lo
 * óptimo"). Doble uso: mide el tracking del paciente hoy (`evaluar`) y a futuro
 * es contexto (grounding) de la IA.
 *
 * Invariantes: parámetro y texto obligatorios; los operadores numéricos exigen
 * `valor` (y `valorMax` ≥ `valor` para ENTRE); INFORMATIVO ignora los umbrales.
 */
export class AxiomaNutricional {
  private constructor(private readonly props: PropiedadesAxioma) {}

  static crear(
    datos: DatosNuevoAxioma,
    id: string,
    ahora: Date = new Date(),
  ): AxiomaNutricional {
    return new AxiomaNutricional(normalizar(datos, id, ahora, ahora));
  }

  static reconstruir(props: PropiedadesAxioma): AxiomaNutricional {
    return new AxiomaNutricional(props);
  }

  /** Copia con los cambios aplicados y validados (id/creadoEn intactos). */
  actualizar(
    cambios: Partial<DatosNuevoAxioma>,
    ahora: Date = new Date(),
  ): AxiomaNutricional {
    const fusionar = <T>(nuevo: T | undefined, actual: T): T =>
      nuevo !== undefined ? nuevo : actual;

    const combinado: DatosNuevoAxioma = {
      ambito: cambios.ambito ?? this.props.ambito,
      parametro: cambios.parametro ?? this.props.parametro,
      operador: cambios.operador ?? this.props.operador,
      valor: fusionar(cambios.valor, this.props.valor),
      valorMax: fusionar(cambios.valorMax, this.props.valorMax),
      unidad: fusionar(cambios.unidad, this.props.unidad),
      texto: cambios.texto ?? this.props.texto,
      prioridad: cambios.prioridad ?? this.props.prioridad,
      activo: cambios.activo ?? this.props.activo,
    };
    return new AxiomaNutricional(
      normalizar(combinado, this.props.id, this.props.creadoEn, ahora),
    );
  }

  /**
   * Evalúa si el valor del paciente cumple el axioma. Devuelve null cuando no
   * es evaluable (INFORMATIVO, sin umbral, o el paciente no tiene el dato).
   */
  evaluar(valor: number | null): boolean | null {
    if (
      valor == null ||
      this.props.operador === "INFORMATIVO" ||
      this.props.valor == null
    ) {
      return null;
    }
    switch (this.props.operador) {
      case "MAYOR_IGUAL":
        return valor >= this.props.valor;
      case "MENOR_IGUAL":
        return valor <= this.props.valor;
      case "ENTRE":
        return (
          this.props.valorMax != null &&
          valor >= this.props.valor &&
          valor <= this.props.valorMax
        );
      default:
        return null;
    }
  }

  get id(): string {
    return this.props.id;
  }
  get parametro(): string {
    return this.props.parametro;
  }
  get activo(): boolean {
    return this.props.activo;
  }

  aPrimitivos(): PropiedadesAxioma {
    return { ...this.props };
  }
}

function normalizar(
  datos: DatosNuevoAxioma,
  id: string,
  creadoEn: Date,
  actualizadoEn: Date,
): PropiedadesAxioma {
  const parametro = datos.parametro?.trim() ?? "";
  if (parametro.length === 0) {
    throw new ErrorValidacion("El axioma debe indicar un parámetro.");
  }
  const texto = datos.texto?.trim() ?? "";
  if (texto.length === 0) {
    throw new ErrorValidacion("El axioma debe tener un texto explicativo.");
  }
  if (!AMBITOS_AXIOMA.includes(datos.ambito)) {
    throw new ErrorValidacion(`Ámbito de axioma desconocido: ${datos.ambito}.`);
  }
  if (!OPERADORES_AXIOMA.includes(datos.operador)) {
    throw new ErrorValidacion(
      `Operador de axioma desconocido: ${datos.operador}.`,
    );
  }

  let valor = datos.valor ?? null;
  let valorMax = datos.valorMax ?? null;

  if (OPERADORES_NUMERICOS.has(datos.operador)) {
    if (valor == null || Number.isNaN(valor)) {
      throw new ErrorValidacion("El axioma con umbral necesita un valor.");
    }
    if (datos.operador === "ENTRE") {
      if (valorMax == null || Number.isNaN(valorMax)) {
        throw new ErrorValidacion(
          "El rango del axioma necesita un valor máximo.",
        );
      }
      if (valorMax < valor) {
        throw new ErrorValidacion(
          "El máximo del axioma no puede ser menor que el mínimo.",
        );
      }
    } else {
      valorMax = null; // MAYOR_IGUAL / MENOR_IGUAL no usan máximo
    }
  } else {
    // INFORMATIVO: sin umbrales.
    valor = null;
    valorMax = null;
  }

  return {
    id,
    ambito: datos.ambito,
    parametro,
    operador: datos.operador,
    valor,
    valorMax,
    unidad: datos.unidad?.trim() || null,
    texto,
    prioridad: datos.prioridad ?? 0,
    activo: datos.activo ?? true,
    creadoEn,
    actualizadoEn,
  };
}
