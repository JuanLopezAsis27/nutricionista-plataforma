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
 * ## Adiposa: tres zonas, no dos regiones
 *
 * Los pliegues se agrupan en SUPERIOR (brazo y tronco alto), CENTRAL (cintura)
 * e INFERIOR (miembro inferior), y cada zona vale lo que aporta a la suma de
 * los pliegues medidos. Es la lectura de la planilla del profesional: partir
 * en tronco/extremidades junta el subescapular con el abdominal —dos zonas que
 * se mueven distinto y se entrenan distinto— y deja «central» sin existir, que
 * es justamente la que se mira por riesgo cardiometabólico.
 *
 * ## Muscular: tres segmentos con Score-Z
 *
 * Brazo, muslo y pierna, cada uno con su perímetro CORREGIDO —el perímetro
 * menos el pliegue del mismo segmento— y su Score-Z contra el humano de
 * referencia Phantom. El porcentaje dice cómo se reparte el músculo entre los
 * tres; el Z dice si ese segmento es grande o chico para la referencia, que es
 * lo que el porcentaje solo no puede contestar: tres segmentos flacos por
 * igual dan el mismo reparto que tres grandes por igual.
 */

export const ZONAS_ADIPOSAS = ["SUPERIOR", "CENTRAL", "INFERIOR"] as const;
export type ZonaAdiposa = (typeof ZONAS_ADIPOSAS)[number];

export const SEGMENTOS_MUSCULARES = ["BRAZO", "MUSLO", "PIERNA"] as const;
export type SegmentoMuscular = (typeof SEGMENTOS_MUSCULARES)[number];

export const ETIQUETAS_ZONA: Record<ZonaAdiposa, string> = {
  SUPERIOR: "Superior",
  CENTRAL: "Central",
  INFERIOR: "Inferior",
};

export const ETIQUETAS_SEGMENTO: Record<SegmentoMuscular, string> = {
  BRAZO: "Brazo",
  MUSLO: "Muslo",
  PIERNA: "Pierna",
};

/** Un pliegue con su valor, para poder auditar de qué está hecha la zona. */
export interface SitioAdiposo {
  campo: keyof MedidasComposicion;
  etiqueta: string;
  /** Espesor del pliegue, en mm. */
  valorMm: number;
}

/** Una de las tres zonas adiposas con lo que aporta al total. */
export interface ZonaAdiposaMedida {
  zona: ZonaAdiposa;
  etiqueta: string;
  /** Σ de los pliegues de la zona, en mm. */
  sumaMm: number;
  /** Cuánto aporta esa suma al total medido, en %. */
  porcentaje: number;
  sitios: SitioAdiposo[];
}

/** Uno de los tres segmentos musculares, crudo y corregido. */
export interface SegmentoMuscularMedido {
  segmento: SegmentoMuscular;
  etiqueta: string;
  /** Nombre del perímetro tal como se toma («Brazo relajado»). */
  etiquetaPerimetro: string;
  /** Perímetro tal como se midió, en cm. */
  perimetroCm: number;
  /** Perímetro con el pliegue del segmento descontado, en cm. */
  corregidoCm: number;
  /** Cuánto aporta el corregido a la suma de los tres, en %. */
  porcentaje: number;
  /**
   * Desvíos estándar del perímetro corregido respecto del Phantom. `null` sin
   * talla: sin ella no se puede escalar la medida a la talla de referencia, y
   * un Z sin escalar mediría el tamaño de la persona, no su proporción.
   */
  scoreZ: number | null;
}

export interface DistribucionAdiposa {
  zonas: ZonaAdiposaMedida[];
  /** Σ de todos los pliegues medidos, en mm. */
  totalMm: number;
}

export interface DistribucionMuscular {
  segmentos: SegmentoMuscularMedido[];
  /** Σ de los perímetros corregidos, en cm. */
  totalCm: number;
}

export interface DistribucionCorporal {
  adiposa: DistribucionAdiposa | null;
  muscular: DistribucionMuscular | null;
}

/**
 * Zona de cada pliegue.
 *
 * El eje es la ALTURA anatómica, no el protocolo: los tres sitios de fuera del
 * ISAK (pectoral, axilar medio y lumbar) entran igual, porque dónde está el
 * pliegue no depende de qué ecuación lo nombre.
 *
 * El subescapular es SUPERIOR y no CENTRAL: la zona central es la cintura —lo
 * que se lee por riesgo cardiometabólico— y el tronco alto se mueve con el
 * tren superior. Es la partición de la planilla del profesional, donde el
 * perfil ISAK de 6 pliegues cae en tres pares: tricipital + subescapular,
 * supraespinal + abdominal, muslo + pantorrilla.
 */
const ZONA_DE_PLIEGUE: Partial<Record<keyof MedidasComposicion, ZonaAdiposa>> =
  {
    pliegueTricipital: "SUPERIOR",
    pliegueBicipital: "SUPERIOR",
    pliegueSubescapular: "SUPERIOR",
    plieguePectoral: "SUPERIOR",
    pliegueAxilarMedio: "SUPERIOR",
    pliegueSupraespinal: "CENTRAL",
    pliegueAbdominal: "CENTRAL",
    pliegueCrestaIliaca: "CENTRAL",
    pliegueLumbar: "CENTRAL",
    pliegueMuslo: "INFERIOR",
    plieguePantorrilla: "INFERIOR",
  };

/**
 * Los tres segmentos: qué perímetro y qué pliegue lo corrige.
 *
 * El muslo va por el perímetro MÁXIMO y no por el medial aunque el pliegue se
 * tome a media altura: la referencia Phantom del muslo corregido está definida
 * sobre el máximo (55,82 − 0,3141 · 27,0 = 47,34), y calcular el valor del
 * paciente sobre un sitio para compararlo contra otro daría un Score-Z que mide
 * la diferencia entre dos protocolos.
 */
const SEGMENTOS: {
  segmento: SegmentoMuscular;
  perimetro: keyof MedidasComposicion;
  pliegue: keyof MedidasComposicion;
}[] = [
  { segmento: "BRAZO", perimetro: "circBrazo", pliegue: "pliegueTricipital" },
  { segmento: "MUSLO", perimetro: "circMusloMaximo", pliegue: "pliegueMuslo" },
  {
    segmento: "PIERNA",
    perimetro: "circPantorrilla",
    pliegue: "plieguePantorrilla",
  },
];

/**
 * Constante de la corrección de perímetro: `perímetro − 3,141 · pliegue / 10`.
 *
 * Es exactamente la del fraccionamiento de Kerr (`calcularFraccionamiento`), a
 * propósito: si acá se corrigiera distinto, dos partes de la misma pantalla
 * dirían cosas distintas sobre el mismo brazo. Se copia tal cual de la planilla
 * y no se reemplaza por PI/10 —ver el encabezado de `composicionCorporal`—.
 */
const FACTOR_CORRECCION_PERIMETRO = 3.141;

/**
 * Desvío estándar Phantom de cada perímetro corregido.
 *
 * La MEDIA no se escribe a mano: sale de aplicarle al Phantom la misma
 * corrección que al paciente (`mediaCorregidaPhantom`), y da exactamente los
 * valores publicados —brazo 22,05; muslo 47,34; pierna 30,22—. Derivarla es lo
 * que garantiza que las dos puntas de la resta usen la misma constante para
 * siempre.
 *
 * El DESVÍO sí es un dato publicado (Ross & Marfell-Jones): no se puede
 * derivar, porque el perímetro y el pliegue del mismo segmento están
 * correlacionados y propagarlos como independientes lo sobreestimaría —los
 * corregidos dispersan MENOS que sus perímetros crudos, no más—.
 */
const DESVIO_CORREGIDO_PHANTOM: Record<SegmentoMuscular, number> = {
  BRAZO: 1.91,
  MUSLO: 3.59,
  PIERNA: 1.97,
};

/**
 * @param k Factor de escalado Phantom (talla de referencia / talla del
 *   paciente), o `null` si no hay talla cargada.
 */
export function calcularDistribucion(
  m: MedidasComposicion,
  k: number | null,
): DistribucionCorporal {
  return {
    adiposa: distribucionAdiposa(m),
    muscular: distribucionMuscular(m, k),
  };
}

function distribucionAdiposa(
  m: MedidasComposicion,
): DistribucionAdiposa | null {
  const medidos = (Object.keys(ZONA_DE_PLIEGUE) as (keyof MedidasComposicion)[])
    .map((campo) => ({
      campo,
      zona: ZONA_DE_PLIEGUE[campo]!,
      valor: positivo(m[campo]),
    }))
    .filter(
      (
        s,
      ): s is {
        campo: keyof MedidasComposicion;
        zona: ZonaAdiposa;
        valor: number;
      } => s.valor != null,
    );

  const total = medidos.reduce((suma, s) => suma + s.valor, 0);
  if (total <= 0) return null;

  const zonas = ZONAS_ADIPOSAS.map((zona) => {
    const sitios = medidos.filter((s) => s.zona === zona);
    const suma = sitios.reduce((acumulado, s) => acumulado + s.valor, 0);
    return {
      zona,
      etiqueta: ETIQUETAS_ZONA[zona],
      sumaMm: redondear(suma, 1),
      porcentaje: redondear((suma / total) * 100, 2),
      sitios: sitios.map((s) => ({
        campo: s.campo,
        etiqueta: ETIQUETAS_MEDIDA[s.campo],
        valorMm: redondear(s.valor, 1),
      })),
    };
  }).filter((z) => z.sitios.length > 0);

  // Con una sola zona medida el reparto es 100 % y no dice nada: eso no es una
  // distribución, es el único pliegue que se tomó.
  if (zonas.length < 2) return null;

  return { zonas, totalMm: redondear(total, 1) };
}

function distribucionMuscular(
  m: MedidasComposicion,
  k: number | null,
): DistribucionMuscular | null {
  const medidos = SEGMENTOS.map((s) => {
    const valorPerimetro = positivo(m[s.perimetro]);
    // Un segmento con perímetro pero sin su pliegue no se corrige a medias:
    // entraría con el tejido adiposo adentro y abultaría su parte del reparto.
    const valorPliegue = positivo(m[s.pliegue]);
    if (valorPerimetro == null || valorPliegue == null) return null;
    const corregido =
      valorPerimetro - (valorPliegue * FACTOR_CORRECCION_PERIMETRO) / 10;
    return corregido > 0 ? { ...s, valorPerimetro, corregido } : null;
  }).filter((s) => s != null);

  if (medidos.length < 2) return null;

  const total = medidos.reduce((suma, s) => suma + s.corregido, 0);
  if (total <= 0) return null;

  return {
    segmentos: medidos.map((s) => ({
      segmento: s.segmento,
      etiqueta: ETIQUETAS_SEGMENTO[s.segmento],
      etiquetaPerimetro: ETIQUETAS_MEDIDA[s.perimetro],
      perimetroCm: redondear(s.valorPerimetro, 1),
      corregidoCm: redondear(s.corregido, 2),
      porcentaje: redondear((s.corregido / total) * 100, 2),
      scoreZ: scoreZCorregido(s.segmento, s.corregido, k),
    })),
    totalCm: redondear(total, 2),
  };
}

/**
 * Score-Z del perímetro corregido: se lleva a la talla del Phantom (escala
 * lineal, como todo perímetro) y se expresa en desvíos de la referencia.
 */
function scoreZCorregido(
  segmento: SegmentoMuscular,
  corregido: number,
  k: number | null,
): number | null {
  if (k == null) return null;
  const media = mediaCorregidaPhantom(segmento);
  if (media == null) return null;
  return redondear(
    (corregido * k - media) / DESVIO_CORREGIDO_PHANTOM[segmento],
    2,
  );
}

/** Perímetro corregido del Phantom, con la misma corrección que el paciente. */
function mediaCorregidaPhantom(segmento: SegmentoMuscular): number | null {
  const definicion = SEGMENTOS.find((s) => s.segmento === segmento);
  if (definicion == null) return null;
  const perimetro = mediaPhantom(definicion.perimetro);
  const pliegue = mediaPhantom(definicion.pliegue);
  if (perimetro == null || pliegue == null) return null;
  return perimetro - (pliegue * FACTOR_CORRECCION_PERIMETRO) / 10;
}

function mediaPhantom(campo: keyof MedidasComposicion): number | null {
  const referencia = (
    REFERENCIAS_PHANTOM as Record<string, { media: number } | undefined>
  )[campo];
  return referencia?.media ?? null;
}

function positivo(valor: number | null | undefined): number | null {
  return valor != null && Number.isFinite(valor) && valor > 0 ? valor : null;
}

function redondear(valor: number, decimales: number): number {
  if (!Number.isFinite(valor)) return 0;
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}
