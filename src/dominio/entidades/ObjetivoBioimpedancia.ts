import { ErrorValidacion } from "../errores/ErrorValidacion";
import { ESTADOS_OBJETIVO, type EstadoObjetivo } from "./Objetivo";
import {
  RANGOS_BIOIMPEDANCIA,
  describirRangoBioimpedancia,
  type MedidasBioimpedancia,
  type RangoBioimpedancia,
} from "./Bioimpedancia";

/**
 * Variables de la bioimpedancia sobre las que se puede plantear una meta: las
 * que informa la balanza, sin derivados. Se agregan al final y nunca se
 * renombran: son también un enum de la base.
 */
export const VARIABLES_BIOIMPEDANCIA = [
  "PESO",
  "MASA_MUSCULAR_KG",
  "MASA_GRASA_KG",
  "PORCENTAJE_MUSCULAR",
  "PORCENTAJE_GRASA",
  "GRASA_VISCERAL",
] as const;
export type VariableBioimpedancia = (typeof VARIABLES_BIOIMPEDANCIA)[number];

/** De qué medida sale cada variable. Constante: la lee también la pantalla. */
export const MEDIDA_DE_VARIABLE_BIOIMPEDANCIA: Record<
  VariableBioimpedancia,
  keyof MedidasBioimpedancia
> = {
  PESO: "pesoKg",
  MASA_MUSCULAR_KG: "masaMuscularKg",
  MASA_GRASA_KG: "masaGrasaKg",
  PORCENTAJE_MUSCULAR: "porcentajeMuscular",
  PORCENTAJE_GRASA: "porcentajeGrasa",
  GRASA_VISCERAL: "nivelGrasaVisceral",
};

/** Unidad, etiqueta y rango válido: los mismos que la medición. */
export function definicionVariableBioimpedancia(
  variable: VariableBioimpedancia,
): RangoBioimpedancia {
  return RANGOS_BIOIMPEDANCIA[MEDIDA_DE_VARIABLE_BIOIMPEDANCIA[variable]];
}

/**
 * Valor de la variable en una medición. Null si esa consulta no la trajo:
 * el punto no entra en la serie en vez de contarse como cero.
 */
export function valorDeVariableBioimpedancia(
  variable: VariableBioimpedancia,
  medidas: MedidasBioimpedancia,
): number | null {
  return medidas[MEDIDA_DE_VARIABLE_BIOIMPEDANCIA[variable]];
}

/** Datos para crear o replantear una meta. */
export interface DatosObjetivoBioimpedancia {
  pacienteId: string;
  variable: VariableBioimpedancia;
  valorObjetivo: number;
  fechaObjetivo?: Date | null;
  notas?: string | null;
}

/** Estado completo de una meta persistida. */
export interface PropiedadesObjetivoBioimpedancia {
  id: string;
  pacienteId: string;
  variable: VariableBioimpedancia;
  valorObjetivo: number;
  fechaObjetivo: Date | null;
  estado: EstadoObjetivo;
  notas: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio ObjetivoBioimpedancia: una meta numérica sobre lo que
 * mide la balanza ("masa muscular a 32 kg para el 30/11").
 *
 * Es la contracara de `ObjetivoComposicion` y no una variable más de aquel:
 * una meta se sigue contra la serie de SU método. Una meta de «% graso» que
 * mezclara consultas de balanza con consultas de pliegues dibujaría saltos que
 * son el cambio de método, no del paciente. Por eso cada fuente tiene sus
 * metas, y la proyección —la misma matemática— se aplica sobre su serie.
 *
 * Una sola vigente por paciente y variable; replantearla la actualiza.
 */
export class ObjetivoBioimpedancia {
  private constructor(
    private readonly props: PropiedadesObjetivoBioimpedancia,
  ) {}

  static crear(
    datos: DatosObjetivoBioimpedancia,
    id: string,
    ahora: Date = new Date(),
  ): ObjetivoBioimpedancia {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("El objetivo debe pertenecer a un paciente.");
    }
    if (!VARIABLES_BIOIMPEDANCIA.includes(datos.variable)) {
      throw new ErrorValidacion("La variable del objetivo no es válida.");
    }
    validarValor(datos.variable, datos.valorObjetivo);
    return new ObjetivoBioimpedancia({
      id,
      pacienteId: datos.pacienteId,
      variable: datos.variable,
      valorObjetivo: datos.valorObjetivo,
      fechaObjetivo: datos.fechaObjetivo ?? null,
      estado: "EN_CURSO",
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(
    props: PropiedadesObjetivoBioimpedancia,
  ): ObjetivoBioimpedancia {
    return new ObjetivoBioimpedancia(props);
  }

  /** Versión inmutable con los cambios aplicados y revalidada. */
  actualizar(
    cambios: {
      valorObjetivo?: number;
      fechaObjetivo?: Date | null;
      notas?: string | null;
      estado?: EstadoObjetivo;
    },
    ahora: Date = new Date(),
  ): ObjetivoBioimpedancia {
    if (cambios.valorObjetivo !== undefined) {
      validarValor(this.props.variable, cambios.valorObjetivo);
    }
    if (
      cambios.estado !== undefined &&
      !ESTADOS_OBJETIVO.includes(cambios.estado)
    ) {
      throw new ErrorValidacion("El estado del objetivo no es válido.");
    }
    return new ObjetivoBioimpedancia({
      ...this.props,
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
  get variable(): VariableBioimpedancia {
    return this.props.variable;
  }
  get descripcion(): string {
    return definicionVariableBioimpedancia(this.props.variable).etiqueta;
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

  aPrimitivos(): PropiedadesObjetivoBioimpedancia {
    return { ...this.props };
  }
}

function validarValor(variable: VariableBioimpedancia, valor: number): void {
  const rango = definicionVariableBioimpedancia(variable);
  if (!Number.isFinite(valor) || valor < rango.min || valor > rango.max) {
    throw new ErrorValidacion(
      `El objetivo de ${rango.etiqueta} debe estar ${describirRangoBioimpedancia(rango)}.`,
    );
  }
  // Una meta de nivel 8,5 no se puede alcanzar nunca: la balanza no la informa.
  if (rango.entero && !Number.isInteger(valor)) {
    throw new ErrorValidacion(
      `El objetivo de ${rango.etiqueta} es un nivel: va un número entero.`,
    );
  }
}
