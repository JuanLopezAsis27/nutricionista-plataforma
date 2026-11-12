import { ErrorValidacion } from "../errores/ErrorValidacion";
import { ESTADOS_OBJETIVO, type EstadoObjetivo } from "./Objetivo";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
  type MetodoGrasa,
} from "../servicios/grasaPorPliegues";
import type { MetaNumerica } from "../servicios/proyeccionComposicion";

/**
 * Variables de composición corporal sobre las que se puede plantear una meta.
 * Son las que el dashboard sabe leer de una medición ya calculada.
 */
export const VARIABLES_COMPOSICION = [
  "PESO",
  "MASA_ADIPOSA_KG",
  "MASA_ADIPOSA_PORCENTAJE",
  "MASA_MUSCULAR_KG",
  "MASA_MUSCULAR_PORCENTAJE",
  "MASA_OSEA_KG",
  "MASA_OSEA_PORCENTAJE",
  "MASA_RESIDUAL_KG",
  "MASA_RESIDUAL_PORCENTAJE",
  "MASA_PIEL_KG",
  "MASA_PIEL_PORCENTAJE",
  "SUMATORIA_6_PLIEGUES",
  "IMC",
  "INDICE_CINTURA_CADERA",
  "PERIMETRO_CINTURA",
  "PORCENTAJE_GRASA",
  "MASA_GRASA_KG",
] as const;
export type VariableComposicion = (typeof VARIABLES_COMPOSICION)[number];

/** Unidad y rango admisible de cada variable, para validar la meta. */
const RANGOS_VARIABLE: Record<
  VariableComposicion,
  { unidad: string; min: number; max: number; etiqueta: string }
> = {
  PESO: { unidad: "kg", min: 20, max: 400, etiqueta: "Peso" },
  MASA_ADIPOSA_KG: { unidad: "kg", min: 1, max: 200, etiqueta: "Masa adiposa" },
  MASA_ADIPOSA_PORCENTAJE: {
    unidad: "%",
    min: 1,
    max: 70,
    etiqueta: "Masa adiposa (%)",
  },
  MASA_MUSCULAR_KG: {
    unidad: "kg",
    min: 5,
    max: 120,
    etiqueta: "Masa muscular",
  },
  MASA_MUSCULAR_PORCENTAJE: {
    unidad: "%",
    min: 10,
    max: 80,
    etiqueta: "Masa muscular (%)",
  },
  MASA_OSEA_KG: { unidad: "kg", min: 2, max: 30, etiqueta: "Masa ósea" },
  MASA_OSEA_PORCENTAJE: {
    unidad: "%",
    min: 3,
    max: 30,
    etiqueta: "Masa ósea (%)",
  },
  MASA_RESIDUAL_KG: {
    unidad: "kg",
    min: 2,
    max: 40,
    etiqueta: "Masa residual",
  },
  MASA_RESIDUAL_PORCENTAJE: {
    unidad: "%",
    min: 3,
    max: 35,
    etiqueta: "Masa residual (%)",
  },
  MASA_PIEL_KG: { unidad: "kg", min: 1, max: 15, etiqueta: "Masa de la piel" },
  MASA_PIEL_PORCENTAJE: {
    unidad: "%",
    min: 1,
    max: 15,
    etiqueta: "Masa de la piel (%)",
  },
  SUMATORIA_6_PLIEGUES: {
    unidad: "mm",
    min: 10,
    max: 400,
    etiqueta: "Σ 6 pliegues",
  },
  IMC: { unidad: "kg/m²", min: 12, max: 60, etiqueta: "IMC" },
  INDICE_CINTURA_CADERA: {
    unidad: "",
    min: 0.4,
    max: 1.5,
    etiqueta: "Índice cintura/cadera",
  },
  PERIMETRO_CINTURA: {
    unidad: "cm",
    min: 40,
    max: 200,
    etiqueta: "Perímetro de cintura",
  },
  PORCENTAJE_GRASA: {
    unidad: "%",
    min: 2,
    max: 70,
    etiqueta: "Porcentaje graso",
  },
  MASA_GRASA_KG: { unidad: "kg", min: 1, max: 200, etiqueta: "Masa grasa" },
};

/**
 * Variables del modelo de 2 componentes. Su valor depende de QUÉ ecuación se
 * use, así que el objetivo tiene que fijar una: seguir un "% graso" que salta
 * de Yuhasz a Durnin & Womersley entre consultas mide el cambio de fórmula,
 * no el progreso del paciente.
 */
export const VARIABLES_DE_GRASA = [
  "PORCENTAJE_GRASA",
  "MASA_GRASA_KG",
] as const satisfies readonly VariableComposicion[];

/** ¿Esta variable exige fijar un método de estimación de grasa? */
export function exigeMetodoGrasa(variable: VariableComposicion): boolean {
  return (VARIABLES_DE_GRASA as readonly VariableComposicion[]).includes(
    variable,
  );
}

/**
 * Los tres orígenes de una variable objetivable, que son las tres formas de
 * medir que conviven en el módulo.
 *
 * La distinción no es cosmética: es la que le dice al profesional SOBRE QUÉ
 * está fijando la meta. Un "12 kg de masa adiposa" (Kerr, anatómico) y un
 * "12 kg de masa grasa" (regresión contra densitometría) son números de
 * modelos distintos que no se comparan entre sí, y en una lista plana de
 * diecisiete variables se eligen a ciegas.
 */
export const ORIGENES_VARIABLE = [
  "FRACCIONAMIENTO",
  "PLIEGUES",
  "BASICOS",
] as const;
export type OrigenVariable = (typeof ORIGENES_VARIABLE)[number];

export const ETIQUETAS_ORIGEN: Record<
  OrigenVariable,
  { titulo: string; detalle: string }
> = {
  FRACCIONAMIENTO: {
    titulo: "Fraccionamiento en 5 masas (Kerr)",
    detalle:
      "Modelo anatómico. Exige el perfil ISAK completo y reparte el peso entre las cinco masas.",
  },
  PLIEGUES: {
    titulo: "Grasa por pliegues (2 componentes)",
    detalle:
      "Regresión contra densitometría. La meta se ata a UNA ecuación, que se elige abajo.",
  },
  BASICOS: {
    titulo: "Básicos e índices",
    detalle:
      "Salen de la medida cruda o de un índice; no dependen de un modelo.",
  },
};

const ORIGEN_DE_VARIABLE: Record<VariableComposicion, OrigenVariable> = {
  PESO: "BASICOS",
  IMC: "BASICOS",
  INDICE_CINTURA_CADERA: "BASICOS",
  PERIMETRO_CINTURA: "BASICOS",
  SUMATORIA_6_PLIEGUES: "BASICOS",
  MASA_ADIPOSA_KG: "FRACCIONAMIENTO",
  MASA_ADIPOSA_PORCENTAJE: "FRACCIONAMIENTO",
  MASA_MUSCULAR_KG: "FRACCIONAMIENTO",
  MASA_MUSCULAR_PORCENTAJE: "FRACCIONAMIENTO",
  MASA_OSEA_KG: "FRACCIONAMIENTO",
  MASA_OSEA_PORCENTAJE: "FRACCIONAMIENTO",
  MASA_RESIDUAL_KG: "FRACCIONAMIENTO",
  MASA_RESIDUAL_PORCENTAJE: "FRACCIONAMIENTO",
  MASA_PIEL_KG: "FRACCIONAMIENTO",
  MASA_PIEL_PORCENTAJE: "FRACCIONAMIENTO",
  PORCENTAJE_GRASA: "PLIEGUES",
  MASA_GRASA_KG: "PLIEGUES",
};

/** Sobre qué forma de medir se plantea la meta de esta variable. */
export function origenDeVariable(
  variable: VariableComposicion,
): OrigenVariable {
  return ORIGEN_DE_VARIABLE[variable];
}

/** Unidad, etiqueta y rango válido de una variable de composición. */
export function definicionVariable(variable: VariableComposicion): {
  unidad: string;
  min: number;
  max: number;
  etiqueta: string;
} {
  return RANGOS_VARIABLE[variable];
}

/**
 * El número de la meta: UN valor (`valorObjetivo`) o UN rango (`valorMinimo`
 * y `valorMaximo`), nunca las dos cosas. Ver `MetaNumerica`: un valor se da
 * por cumplido al pasarse en la dirección buscada; un rango, solo estando
 * adentro.
 */
export interface ValoresMetaComposicion {
  valorObjetivo?: number | null;
  valorMinimo?: number | null;
  valorMaximo?: number | null;
}

/** Datos para crear o reemplazar un objetivo de composición. */
export interface DatosObjetivoComposicion extends ValoresMetaComposicion {
  pacienteId: string;
  variable: VariableComposicion;
  /** Obligatorio en las variables de grasa; null en el resto. */
  metodoGrasa?: MetodoGrasa | null;
  fechaObjetivo?: Date | null;
  notas?: string | null;
}

/** Estado completo de un objetivo persistido. */
export interface PropiedadesObjetivoComposicion {
  id: string;
  pacienteId: string;
  variable: VariableComposicion;
  metodoGrasa: MetodoGrasa | null;
  /** La meta de un valor; null si es un rango. */
  valorObjetivo: number | null;
  /** Los bordes de un rango; los dos null si la meta es un valor. */
  valorMinimo: number | null;
  valorMaximo: number | null;
  fechaObjetivo: Date | null;
  estado: EstadoObjetivo;
  notas: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio ObjetivoComposicion: una meta numérica sobre una
 * variable de composición corporal ("masa adiposa a 12 kg para el 30/11", o
 * "% graso entre 12 y 15").
 *
 * A diferencia de `Objetivo` —que es cualitativo y lleva estrategias e
 * historial— este es puramente cuantitativo: existe para que el dashboard
 * pueda dibujar la brecha y proyectar el ritmo necesario.
 */
export class ObjetivoComposicion {
  private constructor(private readonly props: PropiedadesObjetivoComposicion) {}

  static crear(
    datos: DatosObjetivoComposicion,
    id: string,
    ahora: Date = new Date(),
  ): ObjetivoComposicion {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("El objetivo debe pertenecer a un paciente.");
    }
    if (!VARIABLES_COMPOSICION.includes(datos.variable)) {
      throw new ErrorValidacion("La variable del objetivo no es válida.");
    }
    const valores = validarValores(datos.variable, datos);
    const metodoGrasa = validarMetodo(
      datos.variable,
      datos.metodoGrasa ?? null,
    );

    return new ObjetivoComposicion({
      id,
      pacienteId: datos.pacienteId,
      variable: datos.variable,
      metodoGrasa,
      ...valores,
      fechaObjetivo: datos.fechaObjetivo ?? null,
      estado: "EN_CURSO",
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(
    props: PropiedadesObjetivoComposicion,
  ): ObjetivoComposicion {
    return new ObjetivoComposicion(props);
  }

  /**
   * Versión inmutable con los cambios aplicados y los invariantes revalidados.
   *
   * La meta se reemplaza ENTERA (`meta`): pasar de un valor a un rango deja
   * el valor en null, y al revés. Cambiar un solo borde dejaría combinaciones
   * que no son ni una cosa ni la otra.
   */
  actualizar(
    cambios: {
      metodoGrasa?: MetodoGrasa | null;
      meta?: ValoresMetaComposicion;
      fechaObjetivo?: Date | null;
      notas?: string | null;
      estado?: EstadoObjetivo;
    },
    ahora: Date = new Date(),
  ): ObjetivoComposicion {
    const valores =
      cambios.meta !== undefined
        ? validarValores(this.props.variable, cambios.meta)
        : {
            valorObjetivo: this.props.valorObjetivo,
            valorMinimo: this.props.valorMinimo,
            valorMaximo: this.props.valorMaximo,
          };
    if (
      cambios.estado !== undefined &&
      !ESTADOS_OBJETIVO.includes(cambios.estado)
    ) {
      throw new ErrorValidacion("El estado del objetivo no es válido.");
    }
    return new ObjetivoComposicion({
      ...this.props,
      metodoGrasa: validarMetodo(
        this.props.variable,
        cambios.metodoGrasa !== undefined
          ? cambios.metodoGrasa
          : this.props.metodoGrasa,
      ),
      ...valores,
      fechaObjetivo:
        cambios.fechaObjetivo !== undefined
          ? cambios.fechaObjetivo
          : this.props.fechaObjetivo,
      notas:
        cambios.notas !== undefined
          ? cambios.notas?.trim() || null
          : this.props.notas,
      estado: cambios.estado ?? this.props.estado,
      actualizadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get variable(): VariableComposicion {
    return this.props.variable;
  }
  get metodoGrasa(): MetodoGrasa | null {
    return this.props.metodoGrasa;
  }
  /** Nombre de la meta para la UI: incluye la ecuación cuando la hay. */
  get descripcion(): string {
    const { etiqueta } = RANGOS_VARIABLE[this.props.variable];
    return this.props.metodoGrasa
      ? `${etiqueta} · ${DEFINICIONES_METODO[this.props.metodoGrasa].etiqueta}`
      : etiqueta;
  }
  /** La meta de un valor; null si es un rango. */
  get valorObjetivo(): number | null {
    return this.props.valorObjetivo;
  }
  /** La meta como la lee la proyección: un valor o un rango. */
  get meta(): MetaNumerica {
    const { valorObjetivo, valorMinimo, valorMaximo } = this.props;
    return valorMinimo != null && valorMaximo != null
      ? { rango: { minimo: valorMinimo, maximo: valorMaximo } }
      : { valorObjetivo: valorObjetivo! };
  }
  get fechaObjetivo(): Date | null {
    return this.props.fechaObjetivo;
  }
  get estado(): EstadoObjetivo {
    return this.props.estado;
  }

  aPrimitivos(): PropiedadesObjetivoComposicion {
    return { ...this.props };
  }
}

/**
 * El método solo tiene sentido —y es obligatorio— en las variables de grasa.
 * En el resto se descarta: un objetivo de peso no depende de ninguna ecuación.
 */
function validarMetodo(
  variable: VariableComposicion,
  metodo: MetodoGrasa | null,
): MetodoGrasa | null {
  if (!exigeMetodoGrasa(variable)) return null;
  if (metodo == null) {
    throw new ErrorValidacion(
      "Elegí con qué ecuación de pliegues se va a seguir este objetivo.",
    );
  }
  if (!METODOS_GRASA.includes(metodo)) {
    throw new ErrorValidacion("El método de estimación de grasa no es válido.");
  }
  return metodo;
}

/**
 * Un valor o un rango, nunca los dos ni ninguno. Del rango se exigen los dos
 * bordes: con uno solo es un valor, que ya tiene su propia lectura.
 */
function validarValores(
  variable: VariableComposicion,
  valores: ValoresMetaComposicion,
): {
  valorObjetivo: number | null;
  valorMinimo: number | null;
  valorMaximo: number | null;
} {
  const valor = valores.valorObjetivo ?? null;
  const minimo = valores.valorMinimo ?? null;
  const maximo = valores.valorMaximo ?? null;
  const hayRango = minimo != null || maximo != null;

  if (valor != null && hayRango) {
    throw new ErrorValidacion(
      "La meta es un valor o un rango, no las dos cosas a la vez.",
    );
  }
  if (valor != null) {
    validarValor(variable, valor);
    return { valorObjetivo: valor, valorMinimo: null, valorMaximo: null };
  }
  if (minimo == null || maximo == null) {
    throw new ErrorValidacion(
      hayRango
        ? "El rango necesita un mínimo y un máximo."
        : "Indicá el valor a alcanzar o el rango en el que tiene que quedar.",
    );
  }
  validarValor(variable, minimo);
  validarValor(variable, maximo);
  if (minimo >= maximo) {
    throw new ErrorValidacion(
      "El mínimo del rango tiene que ser menor que el máximo.",
    );
  }
  return { valorObjetivo: null, valorMinimo: minimo, valorMaximo: maximo };
}

function validarValor(variable: VariableComposicion, valor: number): void {
  const { min, max, etiqueta, unidad } = RANGOS_VARIABLE[variable];
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    const sufijo = unidad ? ` ${unidad}` : "";
    throw new ErrorValidacion(
      `El objetivo de ${etiqueta} debe estar entre ${min}${sufijo} y ${max}${sufijo}.`,
    );
  }
}
