import type { MedidasComposicion, GrupoPhantom } from "../composicionCorporal";

/**
 * Tablas de referencia del modelo Phantom (Ross & Wilson).
 *
 * Son DATOS, no lógica: medias y desvíos publicados que no cambian con el
 * código. Ocupaban 220 líneas en el medio del archivo de cálculo, así que
 * corregir un valor de la tabla producía un diff en el mismo archivo que un
 * cambio de algoritmo, y las dos cosas se revisan distinto.
 */

/** Variables con referencia Phantom. */
export const VARIABLES_PHANTOM = [
  "pesoKg",
  "tallaSentadoCm",
  "diamBiacromial",
  "diamToraxTransverso",
  "diamToraxAnteroposterior",
  "diamBiiliocrestideo",
  "diamHumeral",
  "diamFemoral",
  "circCabeza",
  "circBrazo",
  "circBrazoContraido",
  "circAntebrazo",
  "circTorax",
  "circCinturaMinima",
  "circCadera",
  "circMusloMaximo",
  "circMusloMedial",
  "circPantorrilla",
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
] as const satisfies readonly (keyof MedidasComposicion)[];

export type VariablePhantom = (typeof VARIABLES_PHANTOM)[number];

export interface ReferenciaPhantom {
  etiqueta: string;
  grupo: GrupoPhantom;
  media: number;
  desvio: number;
  /**
   * Cómo se lleva la medida a la talla Phantom: "lineal" ×k, "cubica" ×k³
   * (masas y volúmenes) y "cabeza" sin escalar — el cráneo no crece con la
   * talla, y así lo trata también la planilla.
   */
  escala: "lineal" | "cubica" | "cabeza";
}

/**
 * Media y desvío del humano de referencia unisex, por variable.
 * Exportada por el mismo motivo que TALLA_PHANTOM: el formulario la lee para
 * anticipar el Score-Z mientras el profesional carga las medidas.
 */
export const REFERENCIAS_PHANTOM: Record<VariablePhantom, ReferenciaPhantom> = {
  pesoKg: {
    etiqueta: "Peso",
    grupo: "BASICOS",
    media: 64.58,
    desvio: 8.6,
    escala: "cubica",
  },
  tallaSentadoCm: {
    etiqueta: "Talla sentado",
    grupo: "BASICOS",
    media: 89.92,
    desvio: 4.5,
    escala: "lineal",
  },
  diamBiacromial: {
    etiqueta: "Biacromial",
    grupo: "DIAMETROS",
    media: 38.04,
    desvio: 1.92,
    escala: "lineal",
  },
  diamToraxTransverso: {
    etiqueta: "Tórax transverso",
    grupo: "DIAMETROS",
    media: 27.92,
    desvio: 1.74,
    escala: "lineal",
  },
  diamToraxAnteroposterior: {
    etiqueta: "Tórax anteroposterior",
    grupo: "DIAMETROS",
    media: 17.5,
    desvio: 1.38,
    escala: "lineal",
  },
  diamBiiliocrestideo: {
    etiqueta: "Bi-iliocrestídeo",
    grupo: "DIAMETROS",
    media: 28.84,
    desvio: 1.75,
    escala: "lineal",
  },
  diamHumeral: {
    etiqueta: "Humeral",
    grupo: "DIAMETROS",
    media: 6.48,
    desvio: 0.35,
    escala: "lineal",
  },
  diamFemoral: {
    etiqueta: "Femoral",
    grupo: "DIAMETROS",
    media: 9.52,
    desvio: 0.48,
    escala: "lineal",
  },
  circCabeza: {
    etiqueta: "Cabeza",
    grupo: "PERIMETROS",
    media: 56,
    desvio: 1.44,
    escala: "cabeza",
  },
  circBrazo: {
    etiqueta: "Brazo relajado",
    grupo: "PERIMETROS",
    media: 26.89,
    desvio: 2.33,
    escala: "lineal",
  },
  circBrazoContraido: {
    etiqueta: "Brazo flexionado",
    grupo: "PERIMETROS",
    media: 29.41,
    desvio: 2.37,
    escala: "lineal",
  },
  circAntebrazo: {
    etiqueta: "Antebrazo",
    grupo: "PERIMETROS",
    media: 25.13,
    desvio: 1.41,
    escala: "lineal",
  },
  circTorax: {
    etiqueta: "Tórax mesoesternal",
    grupo: "PERIMETROS",
    media: 87.86,
    desvio: 5.18,
    escala: "lineal",
  },
  circCinturaMinima: {
    etiqueta: "Cintura",
    grupo: "PERIMETROS",
    media: 71.91,
    desvio: 4.45,
    escala: "lineal",
  },
  circCadera: {
    etiqueta: "Cadera",
    grupo: "PERIMETROS",
    media: 94.67,
    desvio: 5.58,
    escala: "lineal",
  },
  circMusloMaximo: {
    etiqueta: "Muslo máximo",
    grupo: "PERIMETROS",
    media: 55.82,
    desvio: 4.23,
    escala: "lineal",
  },
  circMusloMedial: {
    etiqueta: "Muslo medial",
    grupo: "PERIMETROS",
    media: 53.2,
    desvio: 4.56,
    escala: "lineal",
  },
  circPantorrilla: {
    etiqueta: "Pantorrilla",
    grupo: "PERIMETROS",
    media: 35.25,
    desvio: 2.3,
    escala: "lineal",
  },
  pliegueTricipital: {
    etiqueta: "Tríceps",
    grupo: "PLIEGUES",
    media: 15.4,
    desvio: 4.47,
    escala: "lineal",
  },
  pliegueSubescapular: {
    etiqueta: "Subescapular",
    grupo: "PLIEGUES",
    media: 17.2,
    desvio: 5.07,
    escala: "lineal",
  },
  pliegueSupraespinal: {
    etiqueta: "Supraespinal",
    grupo: "PLIEGUES",
    media: 15.4,
    desvio: 4.47,
    escala: "lineal",
  },
  pliegueAbdominal: {
    etiqueta: "Abdominal",
    grupo: "PLIEGUES",
    media: 25.4,
    desvio: 7.78,
    escala: "lineal",
  },
  pliegueMuslo: {
    etiqueta: "Muslo medial",
    grupo: "PLIEGUES",
    media: 27,
    desvio: 8.33,
    escala: "lineal",
  },
  plieguePantorrilla: {
    etiqueta: "Pantorrilla",
    grupo: "PLIEGUES",
    media: 16,
    desvio: 4.67,
    escala: "lineal",
  },
};
