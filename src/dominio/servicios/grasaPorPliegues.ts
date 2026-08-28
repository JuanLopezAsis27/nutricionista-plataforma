import {
  ETIQUETAS_MEDIDA,
  type MedidasComposicion,
  type SexoBiologico,
} from "./composicionCorporal";

/**
 * Estimación del porcentaje graso por pliegues cutáneos — modelo de
 * 2 componentes (masa grasa / masa libre de grasa).
 *
 * Es el otro modelo, no una versión reducida del de Kerr. El fraccionamiento
 * en 5 masas es ANATÓMICO (deriva de disección de cadáveres y da masa
 * adiposa: grasa subcutánea); estas ecuaciones son de regresión contra
 * DENSITOMETRÍA y dan grasa corporal TOTAL. Los dos números miden cosas
 * distintas y no son intercambiables: sus series se muestran siempre por
 * separado.
 *
 * Cada ecuación tiene su población de validación. Aplicar la de deportistas a
 * un sedentario (o al revés) es la fuente de error más común, y por eso cada
 * método declara para quién fue validado.
 *
 * Todas las ecuaciones se calculan sobre las medidas que haya: el método que
 * no tiene sus pliegues queda en `faltantes` con el detalle de qué medir.
 */

export const METODOS_GRASA = [
  "YUHASZ_CARTER",
  "YUHASZ_CARTER_KERR",
  "FAULKNER",
  "FAULKNER_KERR",
  "WITHERS",
  "DURNIN_WOMERSLEY",
] as const;
export type MetodoGrasa = (typeof METODOS_GRASA)[number];

/** Los 4 pliegues de Faulkner (y base de Yuhasz/Carter). */
const PLIEGUES_4 = [
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
] as const satisfies readonly (keyof MedidasComposicion)[];

/** Los 6 pliegues de Yuhasz/Carter: los 4 de Faulkner + muslo y pantorrilla. */
const PLIEGUES_6 = [
  ...PLIEGUES_4,
  "pliegueMuslo",
  "plieguePantorrilla",
] as const satisfies readonly (keyof MedidasComposicion)[];

/** Los 7 de Withers en varones: los 6 + el bicipital. */
const PLIEGUES_7_WITHERS = [
  ...PLIEGUES_6,
  "pliegueBicipital",
] as const satisfies readonly (keyof MedidasComposicion)[];

/** Los 4 de Withers en mujeres (no incluye abdominal ni muslo). */
const PLIEGUES_4_WITHERS_F = [
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "plieguePantorrilla",
] as const satisfies readonly (keyof MedidasComposicion)[];

/**
 * Los 4 de Durnin & Womersley. Ojo: usa CRESTA ILÍACA, no supraespinal —
 * son dos sitios distintos del protocolo ISAK y no se sustituyen entre sí.
 */
const PLIEGUES_4_DURNIN = [
  "pliegueBicipital",
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueCrestaIliaca",
] as const satisfies readonly (keyof MedidasComposicion)[];

/** Ficha de un método: para quién sirve y qué necesita. */
export interface DefinicionMetodo {
  etiqueta: string;
  autor: string;
  /** Población en la que se validó la ecuación. */
  poblacion: string;
  /** Pliegues que la ecuación necesita, según el sexo. */
  pliegues: (sexo: SexoBiologico) => readonly (keyof MedidasComposicion)[];
  /** Si estima densidad corporal y recién después convierte con Siri. */
  porDensidad: boolean;
  /** Si la ecuación depende de la edad (solo Durnin & Womersley). */
  necesitaEdad: boolean;
}

export const DEFINICIONES_METODO: Record<MetodoGrasa, DefinicionMetodo> = {
  YUHASZ_CARTER: {
    etiqueta: "Yuhasz / Carter (6 pliegues)",
    autor: "Yuhasz (1974), modificada por Carter (1982)",
    poblacion: "Deportistas y personas activas (3+ sesiones semanales)",
    pliegues: () => PLIEGUES_6,
    porDensidad: false,
    necesitaEdad: false,
  },
  YUHASZ_CARTER_KERR: {
    etiqueta: "Yuhasz / Carter — ajuste Kerr (6 pliegues)",
    autor: "Yuhasz / Carter con la corrección de Kerr",
    poblacion: "Personas sedentarias o poco activas (menos de 3 sesiones)",
    pliegues: () => PLIEGUES_6,
    porDensidad: false,
    necesitaEdad: false,
  },
  FAULKNER: {
    etiqueta: "Faulkner (4 pliegues)",
    autor: "Faulkner (1968)",
    poblacion: "Deportistas y personas activas (3+ sesiones semanales)",
    pliegues: () => PLIEGUES_4,
    porDensidad: false,
    necesitaEdad: false,
  },
  FAULKNER_KERR: {
    etiqueta: "Faulkner — ajuste Kerr (4 pliegues)",
    autor: "Faulkner con la corrección de Kerr",
    poblacion: "Personas sedentarias o poco activas (menos de 3 sesiones)",
    pliegues: () => PLIEGUES_4,
    porDensidad: false,
    necesitaEdad: false,
  },
  WITHERS: {
    etiqueta: "Withers (atletas)",
    autor: "Withers et al. (1987) + Siri (1961)",
    poblacion: "Atletas entrenados",
    pliegues: (sexo) =>
      sexo === "MASCULINO" ? PLIEGUES_7_WITHERS : PLIEGUES_4_WITHERS_F,
    porDensidad: true,
    necesitaEdad: false,
  },
  DURNIN_WOMERSLEY: {
    etiqueta: "Durnin & Womersley (población general)",
    autor: "Durnin & Womersley (1974) + Siri (1961)",
    poblacion: "Población general de 16 a 72 años",
    pliegues: () => PLIEGUES_4_DURNIN,
    porDensidad: true,
    necesitaEdad: true,
  },
};

/** Resultado de un método que sí pudo calcularse. */
export interface ResultadoGrasa {
  metodo: MetodoGrasa;
  etiqueta: string;
  autor: string;
  poblacion: string;
  /** Σ de los pliegues que usa este método (mm). */
  sumatoriaPliegues: number;
  porcentajeGrasa: number;
  masaGrasaKg: number;
  masaLibreGrasaKg: number;
  /** Densidad corporal (g/ml); null en los métodos que no pasan por ella. */
  densidadCorporal: number | null;
}

/** Método que no pudo calcularse y qué le falta. */
export interface MetodoFaltante {
  metodo: MetodoGrasa;
  etiqueta: string;
  campos: string[];
}

export interface GrasaPorPliegues {
  resultados: ResultadoGrasa[];
  faltantes: MetodoFaltante[];
}

/**
 * Coeficientes de Durnin & Womersley (1974) por sexo y franja etaria:
 * DC = c − m · log10(Σ4). Cada fila es [edadMáxima, c, m].
 */
const COEFICIENTES_DURNIN: Record<
  SexoBiologico,
  readonly (readonly [number, number, number])[]
> = {
  MASCULINO: [
    [16.99, 1.1533, 0.0643],
    [19.99, 1.162, 0.063],
    [29.99, 1.1631, 0.0632],
    [39.99, 1.1422, 0.0544],
    [49.99, 1.162, 0.07],
    [Infinity, 1.1715, 0.0779],
  ],
  FEMENINO: [
    [16.99, 1.1369, 0.0598],
    [19.99, 1.1549, 0.0678],
    [29.99, 1.1599, 0.0717],
    [39.99, 1.1423, 0.0632],
    [49.99, 1.1333, 0.0612],
    [Infinity, 1.1339, 0.0645],
  ],
};

/** Faulkner (1968): %grasa = a · Σ4 + b. */
const FAULKNER_COEF: Record<SexoBiologico, { a: number; b: number }> = {
  MASCULINO: { a: 0.153, b: 5.783 },
  FEMENINO: { a: 0.213, b: 7.9 },
};

/** Yuhasz (1974) / Carter (1982): %grasa = a · Σ6 + b. */
const YUHASZ_COEF: Record<SexoBiologico, { a: number; b: number }> = {
  MASCULINO: { a: 0.1051, b: 2.585 },
  FEMENINO: { a: 0.1548, b: 3.58 },
};

/**
 * Corrección de Kerr para población no entrenada. Las ecuaciones de Faulkner
 * y Yuhasz/Carter se derivaron en deportistas y subestiman la grasa de quien
 * no entrena; estos factores la reescalan.
 */
const FACTOR_KERR_4 = 1.14;
const FACTOR_KERR_6 = 1.17;

/**
 * Calcula todos los métodos de 2 componentes que las medidas permitan.
 * Sin sexo biológico no se puede calcular ninguno: todas las ecuaciones
 * tienen coeficientes distintos por sexo.
 */
export function calcularGrasaPorPliegues(
  medidas: MedidasComposicion,
  contexto: { sexo: SexoBiologico | null; edadAnios: number | null },
): GrasaPorPliegues {
  const resultados: ResultadoGrasa[] = [];
  const faltantes: MetodoFaltante[] = [];
  const { sexo, edadAnios } = contexto;

  for (const metodo of METODOS_GRASA) {
    const definicion = DEFINICIONES_METODO[metodo];
    const faltan: string[] = [];
    if (sexo == null) faltan.push("Sexo biológico del paciente");
    if (definicion.necesitaEdad && edadAnios == null) {
      faltan.push("Fecha de nacimiento del paciente");
    }

    // Sin sexo no se sabe siquiera qué pliegues pide Withers; se asume el
    // juego masculino solo para poder listar lo que falta.
    const requeridos = definicion.pliegues(sexo ?? "MASCULINO");
    for (const campo of requeridos) {
      if (positivo(medidas[campo]) == null)
        faltan.push(ETIQUETAS_MEDIDA[campo]);
    }

    if (faltan.length > 0 || sexo == null) {
      faltantes.push({ metodo, etiqueta: definicion.etiqueta, campos: faltan });
      continue;
    }

    const suma = requeridos.reduce(
      (total, campo) => total + medidas[campo]!,
      0,
    );
    const calculado = porcentajeDe(metodo, suma, sexo, edadAnios);
    if (calculado == null) {
      faltantes.push({ metodo, etiqueta: definicion.etiqueta, campos: faltan });
      continue;
    }

    const { porcentaje, densidad } = calculado;
    const masaGrasa = (porcentaje * medidas.pesoKg) / 100;
    resultados.push({
      metodo,
      etiqueta: definicion.etiqueta,
      autor: definicion.autor,
      poblacion: definicion.poblacion,
      sumatoriaPliegues: redondear(suma, 1),
      porcentajeGrasa: redondear(porcentaje, 2),
      masaGrasaKg: redondear(masaGrasa, 2),
      masaLibreGrasaKg: redondear(medidas.pesoKg - masaGrasa, 2),
      densidadCorporal: densidad != null ? redondear(densidad, 5) : null,
    });
  }

  return { resultados, faltantes };
}

/** Porcentaje graso (y densidad, si la ecuación pasa por ella) de un método. */
function porcentajeDe(
  metodo: MetodoGrasa,
  suma: number,
  sexo: SexoBiologico,
  edadAnios: number | null,
): { porcentaje: number; densidad: number | null } | null {
  switch (metodo) {
    case "FAULKNER": {
      const { a, b } = FAULKNER_COEF[sexo];
      return { porcentaje: a * suma + b, densidad: null };
    }
    case "FAULKNER_KERR": {
      const { a, b } = FAULKNER_COEF[sexo];
      return { porcentaje: FACTOR_KERR_4 * (a * suma + b), densidad: null };
    }
    case "YUHASZ_CARTER": {
      const { a, b } = YUHASZ_COEF[sexo];
      return { porcentaje: a * suma + b, densidad: null };
    }
    case "YUHASZ_CARTER_KERR": {
      const { a, b } = YUHASZ_COEF[sexo];
      return { porcentaje: FACTOR_KERR_6 * (a * suma + b), densidad: null };
    }
    case "WITHERS": {
      // En varones la ecuación es lineal sobre la Σ7; en mujeres, logarítmica
      // sobre una Σ4 distinta. No es la misma ecuación con otro coeficiente.
      const densidad =
        sexo === "MASCULINO"
          ? 1.0988 - 0.0004 * suma
          : 1.20953 - 0.08294 * Math.log10(suma);
      return { porcentaje: siri(densidad), densidad };
    }
    case "DURNIN_WOMERSLEY": {
      if (edadAnios == null) return null;
      const fila = COEFICIENTES_DURNIN[sexo].find(
        ([edadMaxima]) => edadAnios <= edadMaxima,
      );
      if (!fila) return null;
      const [, c, m] = fila;
      const densidad = c - m * Math.log10(suma);
      return { porcentaje: siri(densidad), densidad };
    }
  }
}

/** Siri (1961): convierte densidad corporal en porcentaje de grasa. */
function siri(densidad: number): number {
  return 495 / densidad - 450;
}

/** Trata 0, null y valores no finitos como "no medido". */
function positivo(valor: number | null | undefined): number | null {
  return valor != null && Number.isFinite(valor) && valor > 0 ? valor : null;
}

function redondear(valor: number, decimales: number): number {
  if (!Number.isFinite(valor)) return 0;
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

// --- Proyección de pliegues ---------------------------------------------------

/** Un pliegue con su valor de hoy y el que haría falta para la meta. */
export interface PlieguePlaneado {
  campo: keyof MedidasComposicion;
  etiqueta: string;
  actualMm: number;
  objetivoMm: number;
  /** Objetivo − actual (negativo = hay que bajar). */
  diferenciaMm: number;
}

/** Cómo tendrían que quedar los pliegues para alcanzar una meta. */
export interface ProyeccionPliegues {
  /** Ecuación de la meta; null cuando la meta es del fraccionamiento de Kerr. */
  metodo: MetodoGrasa | null;
  etiqueta: string;
  sumaActualMm: number;
  sumaObjetivoMm: number;
  pliegues: PlieguePlaneado[];
  /**
   * La meta exige dejar algún pliegue por debajo del mínimo fisiológico.
   * No invalida el cálculo, pero conviene decirlo: no es alcanzable midiendo.
   */
  fueraDeRango: boolean;
}

/**
 * Pliegue más fino que se puede medir con plicómetro en la práctica. Por
 * debajo de esto la meta no es alcanzable: no queda tejido que perder.
 */
export const PLIEGUE_MINIMO_MM = 2;
