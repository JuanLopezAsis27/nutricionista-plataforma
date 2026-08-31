import type { MedidasComposicion } from "../composicionCorporal";
import { ETIQUETAS_MEDIDA } from "./etiquetasMedida";
import { REFERENCIAS_PHANTOM } from "./referenciasPhantom";

/**
 * Distribución de la adiposidad y de la masa muscular: no CUÁNTA hay, sino
 * DÓNDE está.
 *
 * Es una lectura distinta de las mismas medidas y responde a otra pregunta.
 * El fraccionamiento y las ecuaciones de pliegues dan totales —12 kg de masa
 * adiposa, 18 % de grasa—; dos personas con el mismo total pueden tener toda
 * esa grasa en el tronco o repartida en las extremidades, y eso cambia tanto
 * el riesgo cardiometabólico como la lectura del entrenamiento.
 *
 * Nada de esto se persiste: se recalcula de las medidas crudas en cada
 * lectura, como el resto de lo derivado.
 *
 * ## Cómo se lee el patrón
 *
 * El reparto crudo no se puede juzgar solo: el pliegue abdominal es más
 * grueso que el tricipital en casi todo el mundo, así que "el abdomen aporta
 * más" no dice nada por sí mismo. Lo que se compara es la razón
 * tronco/extremidades del paciente contra la MISMA razón en el humano de
 * referencia Phantom, calculada sobre los MISMOS sitios que se midieron. Así
 * un perfil de 4 pliegues y uno de 8 se leen cada uno contra su propia
 * referencia, en vez de contra una constante que solo valdría para el perfil
 * completo.
 */

export const REGIONES_ADIPOSAS = ["TRONCO", "EXTREMIDADES"] as const;
export type RegionAdiposa = (typeof REGIONES_ADIPOSAS)[number];

export const REGIONES_MUSCULARES = ["SUPERIOR", "INFERIOR"] as const;
export type RegionMuscular = (typeof REGIONES_MUSCULARES)[number];

export const PATRONES_ADIPOSOS = [
  "CENTRAL",
  "EQUILIBRADO",
  "PERIFERICO",
] as const;
export type PatronAdiposo = (typeof PATRONES_ADIPOSOS)[number];

export const PATRONES_MUSCULARES = [
  "SUPERIOR",
  "EQUILIBRADO",
  "INFERIOR",
] as const;
export type PatronMuscular = (typeof PATRONES_MUSCULARES)[number];

/** Un sitio con lo que aporta al total. */
export interface ParteDistribucion<R extends string> {
  campo: keyof MedidasComposicion;
  etiqueta: string;
  /** Valor del sitio: mm en los pliegues, cm en los perímetros corregidos. */
  valor: number;
  /** Cuánto aporta al total medido, en %. */
  porcentaje: number;
  region: R;
}

/** Lo común a las dos distribuciones: sitios, razón y patrón. */
interface DistribucionBase<R extends string, P extends string> {
  partes: ParteDistribucion<R>[];
  total: number;
  /**
   * Razón entre las dos regiones. `null` cuando falta alguna de las dos, o
   * cuando los sitios medidos no tienen referencia Phantom con la cual
   * compararla — que es lo que la vuelve interpretable.
   */
  razon: number | null;
  /** La misma razón en el Phantom, sobre los mismos sitios. */
  razonReferencia: number | null;
  /** Razón del paciente / razón del Phantom. 1 = reparto de referencia. */
  relativa: number | null;
  patron: P | null;
}

export type DistribucionAdiposa = DistribucionBase<
  RegionAdiposa,
  PatronAdiposo
>;
export type DistribucionMuscular = DistribucionBase<
  RegionMuscular,
  PatronMuscular
>;

export interface DistribucionCorporal {
  adiposa: DistribucionAdiposa | null;
  muscular: DistribucionMuscular | null;
}

/**
 * Región de cada pliegue.
 *
 * Pectoral, axilar medio y lumbar son de tronco aunque no sean del perfil
 * ISAK: la región es anatómica, no depende de qué protocolo los nombre.
 */
const REGION_DE_PLIEGUE: Partial<
  Record<keyof MedidasComposicion, RegionAdiposa>
> = {
  pliegueSubescapular: "TRONCO",
  pliegueSupraespinal: "TRONCO",
  pliegueAbdominal: "TRONCO",
  pliegueCrestaIliaca: "TRONCO",
  plieguePectoral: "TRONCO",
  pliegueAxilarMedio: "TRONCO",
  pliegueLumbar: "TRONCO",
  pliegueTricipital: "EXTREMIDADES",
  pliegueBicipital: "EXTREMIDADES",
  pliegueMuslo: "EXTREMIDADES",
  plieguePantorrilla: "EXTREMIDADES",
};

/**
 * Segmentos musculares: perímetro menos el pliegue del mismo segmento.
 *
 * El perímetro crudo mide músculo + hueso + grasa subcutánea; descontar el
 * pliegue deja una estimación del músculo del segmento. La constante 3,141 y
 * la elección del muslo MÁXIMO son las mismas que usa el fraccionamiento de
 * Kerr (`calcularFraccionamiento`), a propósito: si acá se corrigiera
 * distinto, dos partes de la misma pantalla dirían cosas distintas sobre el
 * mismo brazo.
 *
 * El antebrazo va sin corregir porque el protocolo no tiene un pliegue de
 * antebrazo; Kerr hace lo mismo.
 */
const SEGMENTOS_MUSCULARES: {
  campo: keyof MedidasComposicion;
  pliegue: keyof MedidasComposicion | null;
  region: RegionMuscular;
}[] = [
  { campo: "circBrazo", pliegue: "pliegueTricipital", region: "SUPERIOR" },
  { campo: "circAntebrazo", pliegue: null, region: "SUPERIOR" },
  { campo: "circMusloMaximo", pliegue: "pliegueMuslo", region: "INFERIOR" },
  {
    campo: "circPantorrilla",
    pliegue: "plieguePantorrilla",
    region: "INFERIOR",
  },
];

const FACTOR_CORRECCION_PERIMETRO = 3.141;

/**
 * Cuánto tiene que apartarse la razón del paciente de la del Phantom para
 * dejar de leerse como "equilibrado".
 *
 * 15 % es deliberadamente ancho: la medición de un pliegue tiene un error
 * técnico del orden del 5 % y la razón combina varios, así que un umbral
 * estrecho haría cambiar de patrón entre dos consultas sin que el paciente
 * haya cambiado.
 */
const MARGEN_PATRON = 0.15;

export function calcularDistribucion(
  m: MedidasComposicion,
): DistribucionCorporal {
  return { adiposa: distribucionAdiposa(m), muscular: distribucionMuscular(m) };
}

function distribucionAdiposa(
  m: MedidasComposicion,
): DistribucionAdiposa | null {
  const medidos = (
    Object.keys(REGION_DE_PLIEGUE) as (keyof MedidasComposicion)[]
  )
    .map((campo) => ({
      campo,
      region: REGION_DE_PLIEGUE[campo]!,
      valor: positivo(m[campo]),
    }))
    .filter(
      (
        s,
      ): s is {
        campo: keyof MedidasComposicion;
        region: RegionAdiposa;
        valor: number;
      } => s.valor != null,
    );

  if (medidos.length < 2) return null;

  const total = medidos.reduce((suma, s) => suma + s.valor, 0);
  const partes = medidos.map((s) => ({
    campo: s.campo,
    etiqueta: ETIQUETAS_MEDIDA[s.campo],
    valor: redondear(s.valor, 1),
    porcentaje: redondear((s.valor / total) * 100, 1),
    region: s.region,
  }));

  const razones = compararRegiones(medidos, "TRONCO", "EXTREMIDADES", (campo) =>
    referenciaPliegue(campo),
  );

  return {
    partes,
    total: redondear(total, 1),
    ...razones,
    patron: clasificar(
      razones.relativa,
      "CENTRAL",
      "EQUILIBRADO",
      "PERIFERICO",
    ),
  };
}

function distribucionMuscular(
  m: MedidasComposicion,
): DistribucionMuscular | null {
  const medidos = SEGMENTOS_MUSCULARES.map((s) => {
    const perimetro = positivo(m[s.campo]);
    if (perimetro == null) return null;
    // Un segmento con perímetro pero sin su pliegue no se corrige a medias:
    // entraría con el tejido adiposo adentro y abultaría su parte del reparto.
    const pliegue = s.pliegue == null ? 0 : positivo(m[s.pliegue]);
    if (pliegue == null) return null;
    const valor = perimetro - (pliegue * FACTOR_CORRECCION_PERIMETRO) / 10;
    return valor > 0 ? { campo: s.campo, region: s.region, valor } : null;
  }).filter((s) => s != null);

  if (medidos.length < 2) return null;

  const total = medidos.reduce((suma, s) => suma + s.valor, 0);
  const partes = medidos.map((s) => ({
    campo: s.campo,
    etiqueta: ETIQUETAS_MEDIDA[s.campo],
    valor: redondear(s.valor, 1),
    porcentaje: redondear((s.valor / total) * 100, 1),
    region: s.region,
  }));

  const razones = compararRegiones(medidos, "SUPERIOR", "INFERIOR", (campo) =>
    referenciaSegmento(campo),
  );

  return {
    partes,
    total: redondear(total, 1),
    ...razones,
    patron: clasificar(razones.relativa, "SUPERIOR", "EQUILIBRADO", "INFERIOR"),
  };
}

/**
 * Razón entre dos regiones y la misma razón en el Phantom, calculada sobre
 * los sitios que de verdad se midieron.
 *
 * Un sitio sin referencia Phantom —bicipital, cresta ilíaca y los tres de
 * fuera del ISAK no la tienen— entra en el reparto pero se excluye de LAS DOS
 * sumas de la razón. Dejarlo solo en el numerador del paciente compararía
 * contra una referencia que no lo incluye, que es peor que no comparar.
 */
function compararRegiones<R extends string>(
  medidos: { campo: keyof MedidasComposicion; region: R; valor: number }[],
  regionA: R,
  regionB: R,
  referenciaDe: (campo: keyof MedidasComposicion) => number | null,
): {
  razon: number | null;
  razonReferencia: number | null;
  relativa: number | null;
} {
  const vacio = { razon: null, razonReferencia: null, relativa: null };

  const comparables = medidos
    .map((s) => ({ ...s, referencia: referenciaDe(s.campo) }))
    .filter((s) => s.referencia != null);

  const sumar = (region: R, campo: "valor" | "referencia"): number =>
    comparables
      .filter((s) => s.region === region)
      .reduce(
        (suma, s) => suma + (campo === "valor" ? s.valor : s.referencia!),
        0,
      );

  const a = sumar(regionA, "valor");
  const b = sumar(regionB, "valor");
  const refA = sumar(regionA, "referencia");
  const refB = sumar(regionB, "referencia");
  if (a <= 0 || b <= 0 || refA <= 0 || refB <= 0) return vacio;

  const razon = a / b;
  const razonReferencia = refA / refB;
  return {
    razon: redondear(razon, 3),
    razonReferencia: redondear(razonReferencia, 3),
    relativa: redondear(razon / razonReferencia, 3),
  };
}

/** Media Phantom del pliegue, en mm. */
function referenciaPliegue(campo: keyof MedidasComposicion): number | null {
  return mediaPhantom(campo);
}

/**
 * Perímetro corregido del Phantom: su media de perímetro menos su media de
 * pliegue, con la misma corrección que se le aplica al paciente.
 */
function referenciaSegmento(campo: keyof MedidasComposicion): number | null {
  const segmento = SEGMENTOS_MUSCULARES.find((s) => s.campo === campo);
  const perimetro = mediaPhantom(campo);
  if (segmento == null || perimetro == null) return null;
  if (segmento.pliegue == null) return perimetro;
  const pliegue = mediaPhantom(segmento.pliegue);
  if (pliegue == null) return null;
  return perimetro - (pliegue * FACTOR_CORRECCION_PERIMETRO) / 10;
}

function mediaPhantom(campo: keyof MedidasComposicion): number | null {
  const referencia = (
    REFERENCIAS_PHANTOM as Record<string, { media: number } | undefined>
  )[campo];
  return referencia?.media ?? null;
}

function clasificar<P extends string>(
  relativa: number | null,
  haciaArriba: P,
  equilibrado: P,
  haciaAbajo: P,
): P | null {
  if (relativa == null) return null;
  if (relativa > 1 + MARGEN_PATRON) return haciaArriba;
  if (relativa < 1 - MARGEN_PATRON) return haciaAbajo;
  return equilibrado;
}

function positivo(valor: number | null | undefined): number | null {
  return valor != null && Number.isFinite(valor) && valor > 0 ? valor : null;
}

function redondear(valor: number, decimales: number): number {
  if (!Number.isFinite(valor)) return 0;
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}
