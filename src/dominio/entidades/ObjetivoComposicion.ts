import { ErrorValidacion } from "../errores/ErrorValidacion";
import { ESTADOS_OBJETIVO, type EstadoObjetivo } from "./Objetivo";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
  type MetodoGrasa,
} from "../servicios/grasaPorPliegues";

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

/** Unidad, etiqueta y rango válido de una variable de composición. */
export function definicionVariable(variable: VariableComposicion): {
  unidad: string;
  min: number;
  max: number;
  etiqueta: string;
} {
  return RANGOS_VARIABLE[variable];
}

/** Datos para crear o reemplazar un objetivo de composición. */
export interface DatosObjetivoComposicion {
  pacienteId: string;
  variable: VariableComposicion;
  /** Obligatorio en las variables de grasa; null en el resto. */
  metodoGrasa?: MetodoGrasa | null;
  valorObjetivo: number;
  fechaObjetivo?: Date | null;
  notas?: string | null;
}

/** Estado completo de un objetivo persistido. */
export interface PropiedadesObjetivoComposicion {
  id: string;
  pacienteId: string;
  variable: VariableComposicion;
  metodoGrasa: MetodoGrasa | null;
  valorObjetivo: number;
  fechaObjetivo: Date | null;
  estado: EstadoObjetivo;
  notas: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio ObjetivoComposicion: una meta numérica sobre una
 * variable de composición corporal ("masa adiposa a 12 kg para el 30/11").
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
    validarValor(datos.variable, datos.valorObjetivo);
    const metodoGrasa = validarMetodo(
      datos.variable,
      datos.metodoGrasa ?? null,
    );

    return new ObjetivoComposicion({
      id,
      pacienteId: datos.pacienteId,
      variable: datos.variable,
      metodoGrasa,
      valorObjetivo: datos.valorObjetivo,
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

  /** Versión inmutable con los cambios aplicados y los invariantes revalidados. */
  actualizar(
    cambios: {
      metodoGrasa?: MetodoGrasa | null;
      valorObjetivo?: number;
      fechaObjetivo?: Date | null;
      notas?: string | null;
      estado?: EstadoObjetivo;
    },
    ahora: Date = new Date(),
  ): ObjetivoComposicion {
    if (cambios.valorObjetivo !== undefined) {
      validarValor(this.props.variable, cambios.valorObjetivo);
    }
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
      valorObjetivo: cambios.valorObjetivo ?? this.props.valorObjetivo,
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
  get valorObjetivo(): number {
    return this.props.valorObjetivo;
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

function validarValor(variable: VariableComposicion, valor: number): void {
  const { min, max, etiqueta, unidad } = RANGOS_VARIABLE[variable];
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    const sufijo = unidad ? ` ${unidad}` : "";
    throw new ErrorValidacion(
      `El objetivo de ${etiqueta} debe estar entre ${min}${sufijo} y ${max}${sufijo}.`,
    );
  }
}
