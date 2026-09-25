import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Lo que informa la balanza de bioimpedancia en una consulta. Solo el peso es
 * obligatorio, como en la antropometría: hay equipos que no dan el porcentaje
 * muscular, y una consulta sin él sigue siendo una consulta.
 */
export interface MedidasBioimpedancia {
  pesoKg: number;
  masaMuscularKg: number | null;
  masaGrasaKg: number | null;
  porcentajeMuscular: number | null;
  porcentajeGrasa: number | null;
  /**
   * Nivel de grasa visceral, en la escala del equipo: un número ENTERO sin
   * unidad (1, 2, 3…), no kilos ni porcentaje. La balanza no informa la masa
   * de grasa visceral sino un índice, y se anota tal cual lo muestra.
   */
  nivelGrasaVisceral: number | null;
}

/** Datos para registrar una medición de bioimpedancia. */
export interface DatosNuevaBioimpedancia {
  pacienteId: string;
  fecha: Date;
  pesoKg: number;
  masaMuscularKg?: number | null;
  masaGrasaKg?: number | null;
  porcentajeMuscular?: number | null;
  porcentajeGrasa?: number | null;
  nivelGrasaVisceral?: number | null;
  observaciones?: string | null;
}

/** Estado completo de una medición persistida. */
export interface PropiedadesBioimpedancia extends MedidasBioimpedancia {
  id: string;
  pacienteId: string;
  fecha: Date;
  observaciones: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Cambios aplicables a una medición existente. */
export type CambiosBioimpedancia = Partial<
  Omit<DatosNuevaBioimpedancia, "pacienteId">
>;

/** Rango admisible, unidad y etiqueta de una medida de la balanza. */
export interface RangoBioimpedancia {
  min: number;
  max: number;
  /** Vacía en los niveles, que son una escala y no una magnitud. */
  unidad: string;
  etiqueta: string;
  /** Solo admite enteros: los niveles del equipo no tienen decimales. */
  entero?: boolean;
}

/**
 * Rango admisible de cada medida. Es el mismo que usan las metas: una meta
 * fuera de lo que una balanza puede informar no es una meta.
 */
export const RANGOS_BIOIMPEDANCIA: Record<
  keyof MedidasBioimpedancia,
  RangoBioimpedancia
> = {
  pesoKg: { min: 20, max: 400, unidad: "kg", etiqueta: "Peso" },
  masaMuscularKg: {
    min: 1,
    max: 150,
    unidad: "kg",
    etiqueta: "Masa muscular",
  },
  masaGrasaKg: { min: 0, max: 200, unidad: "kg", etiqueta: "Masa grasa" },
  porcentajeMuscular: {
    min: 1,
    max: 90,
    unidad: "%",
    etiqueta: "Porcentaje muscular",
  },
  porcentajeGrasa: {
    min: 1,
    max: 75,
    unidad: "%",
    etiqueta: "Porcentaje graso",
  },
  // La escala más amplia en uso es la de Tanita (1 a 59); Omron llega a 30.
  // Se acepta la más amplia: el rango es para frenar un error de tipeo, no
  // para decidir qué equipo usa el consultorio.
  nivelGrasaVisceral: {
    min: 1,
    max: 59,
    unidad: "",
    etiqueta: "Grasa visceral",
    entero: true,
  },
};

/** «entre 1 y 59» / «entre 20 y 400 kg»: sin el espacio colgado del nivel. */
export function describirRangoBioimpedancia(rango: RangoBioimpedancia): string {
  return `entre ${rango.min} y ${rango.max}${rango.unidad ? ` ${rango.unidad}` : ""}`;
}

/**
 * Entidad de dominio Bioimpedancia: una medición de composición corporal
 * tomada con una balanza de bioimpedancia en una consulta.
 *
 * Es una FUENTE DISTINTA de la antropometría y no se mezcla con ella. La
 * balanza estima la composición por la resistencia eléctrica del cuerpo —y se
 * mueve con la hidratación—; el fraccionamiento de Kerr la reconstruye desde
 * medidas anatómicas. Un «% graso» de cada lado son dos números de dos
 * métodos, igual que las ecuaciones de pliegues entre sí.
 *
 * A diferencia de la antropometría, acá NO hay nada derivado: el equipo ya
 * calcula la composición y el profesional anota lo que informa. Por eso los
 * valores se guardan tal cual, porcentajes incluidos —recalcular el
 * porcentaje desde los kg daría otro número que el que el paciente vio en la
 * pantalla de la balanza—.
 *
 * Una por paciente y fecha, como la antropometría y la evolución.
 */
export class Bioimpedancia {
  private constructor(private readonly props: PropiedadesBioimpedancia) {}

  static crear(
    datos: DatosNuevaBioimpedancia,
    id: string,
    ahora: Date = new Date(),
  ): Bioimpedancia {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion(
        "La medición de bioimpedancia debe pertenecer a un paciente.",
      );
    }
    const props: PropiedadesBioimpedancia = {
      id,
      pacienteId: datos.pacienteId,
      fecha: datos.fecha,
      pesoKg: datos.pesoKg,
      masaMuscularKg: datos.masaMuscularKg ?? null,
      masaGrasaKg: datos.masaGrasaKg ?? null,
      porcentajeMuscular: datos.porcentajeMuscular ?? null,
      porcentajeGrasa: datos.porcentajeGrasa ?? null,
      nivelGrasaVisceral: datos.nivelGrasaVisceral ?? null,
      observaciones: datos.observaciones?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    validar(props);
    return new Bioimpedancia(props);
  }

  static reconstruir(props: PropiedadesBioimpedancia): Bioimpedancia {
    return new Bioimpedancia(props);
  }

  /** Versión inmutable con los cambios aplicados y revalidada. */
  actualizar(
    cambios: CambiosBioimpedancia,
    ahora: Date = new Date(),
  ): Bioimpedancia {
    const props: PropiedadesBioimpedancia = {
      ...this.props,
      fecha: cambios.fecha ?? this.props.fecha,
      pesoKg: cambios.pesoKg ?? this.props.pesoKg,
      masaMuscularKg: siCambio(
        cambios.masaMuscularKg,
        this.props.masaMuscularKg,
      ),
      masaGrasaKg: siCambio(cambios.masaGrasaKg, this.props.masaGrasaKg),
      porcentajeMuscular: siCambio(
        cambios.porcentajeMuscular,
        this.props.porcentajeMuscular,
      ),
      porcentajeGrasa: siCambio(
        cambios.porcentajeGrasa,
        this.props.porcentajeGrasa,
      ),
      nivelGrasaVisceral: siCambio(
        cambios.nivelGrasaVisceral,
        this.props.nivelGrasaVisceral,
      ),
      observaciones:
        cambios.observaciones !== undefined
          ? cambios.observaciones?.trim() || null
          : this.props.observaciones,
      actualizadoEn: ahora,
    };
    validar(props);
    return new Bioimpedancia(props);
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get fecha(): Date {
    return this.props.fecha;
  }
  get medidas(): MedidasBioimpedancia {
    const {
      pesoKg,
      masaMuscularKg,
      masaGrasaKg,
      porcentajeMuscular,
      porcentajeGrasa,
      nivelGrasaVisceral,
    } = this.props;
    return {
      pesoKg,
      masaMuscularKg,
      masaGrasaKg,
      porcentajeMuscular,
      porcentajeGrasa,
      nivelGrasaVisceral,
    };
  }

  aPrimitivos(): PropiedadesBioimpedancia {
    return { ...this.props };
  }
}

/** `undefined` = no se tocó; `null` = se borró a propósito. */
function siCambio(
  nuevo: number | null | undefined,
  actual: number | null,
): number | null {
  return nuevo !== undefined ? nuevo : actual;
}

function validar(props: PropiedadesBioimpedancia): void {
  if (Number.isNaN(props.fecha.getTime())) {
    throw new ErrorValidacion("La fecha de la medición no es válida.");
  }
  for (const campo of Object.keys(
    RANGOS_BIOIMPEDANCIA,
  ) as (keyof MedidasBioimpedancia)[]) {
    const valor = props[campo];
    if (valor == null) continue;
    const rango = RANGOS_BIOIMPEDANCIA[campo];
    if (!Number.isFinite(valor) || valor < rango.min || valor > rango.max) {
      throw new ErrorValidacion(
        `${rango.etiqueta} debe estar ${describirRangoBioimpedancia(rango)}.`,
      );
    }
    if (rango.entero && !Number.isInteger(valor)) {
      throw new ErrorValidacion(
        `${rango.etiqueta} es un nivel: va un número entero.`,
      );
    }
  }
  // Una parte del cuerpo no puede pesar más que el cuerpo entero. Es el error
  // de tipeo más probable al pasar los números de la pantalla de la balanza:
  // anotar en «kg de músculo» el valor que era del peso.
  for (const campo of ["masaMuscularKg", "masaGrasaKg"] as const) {
    const valor = props[campo];
    if (valor != null && valor > props.pesoKg) {
      throw new ErrorValidacion(
        `${RANGOS_BIOIMPEDANCIA[campo].etiqueta} no puede superar el peso.`,
      );
    }
  }
  if (
    props.porcentajeMuscular != null &&
    props.porcentajeGrasa != null &&
    props.porcentajeMuscular + props.porcentajeGrasa > 100
  ) {
    throw new ErrorValidacion(
      "El porcentaje muscular y el graso juntos no pueden superar el 100 %.",
    );
  }
}
