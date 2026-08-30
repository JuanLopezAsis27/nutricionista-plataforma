/**
 * Composición corporal — cálculo puro (sin dependencias externas).
 *
 * Reproduce la planilla "Antropogim" del profesional (Ross & Kerr):
 *
 * - Fraccionamiento en 5 componentes (D. Kerr, 1988) con re-ajuste
 *   proporcional al peso bruto.
 * - Modelo de proporcionalidad Phantom (Ross & Wilson, 1974).
 * - Somatotipo de Heath & Carter (1990) y su somatocarta.
 * - Índices antropométricos y estimación del gasto energético.
 *
 * Todos los campos salvo el peso son opcionales: cada bloque se calcula si
 * están sus medidas y devuelve `null` cuando falta alguna, informando en
 * `faltantes` qué hay que medir. Nunca lanza: es una función de lectura.
 *
 * Las constantes numéricas (3,141 y 0,3141 en las correcciones de perímetro,
 * 0,3333 como raíz cúbica) se copian tal cual de la planilla: reemplazarlas
 * por PI/10 o 1/3 desplazaría los resultados respecto de los informes
 * históricos del profesional.
 */

import {
  calcularGrasaPorPliegues,
  type GrasaPorPliegues,
} from "./grasaPorPliegues";

/** Sexo biológico: define las constantes de piel, peso ideal y metabolismo. */
export const SEXOS_BIOLOGICOS = ["MASCULINO", "FEMENINO"] as const;
export type SexoBiologico = (typeof SEXOS_BIOLOGICOS)[number];

/** Nivel de actividad física (OMS, 1985) para el gasto energético total. */
export const NIVELES_ACTIVIDAD = [
  "SEDENTARIA",
  "LIVIANA",
  "MODERADA",
  "INTENSA",
  "EXTREMADA",
] as const;
export type NivelActividad = (typeof NIVELES_ACTIVIDAD)[number];

/**
 * Talla del humano de referencia Phantom (cm).
 * Se exporta porque el formulario de carga muestra el Score-Z en vivo: es
 * vocabulario compartido (una constante), no lógica de dominio saliendo.
 */
export const TALLA_PHANTOM = 170.18;
/** Talla sentado del Phantom (cm): escala aparte la masa residual. */
const TALLA_SENTADO_PHANTOM = 89.92;

/** Medidas crudas que entran al cálculo. Solo el peso es obligatorio. */
export interface MedidasComposicion {
  pesoKg: number;
  tallaCm: number | null;
  tallaSentadoCm: number | null;
  // Diámetros óseos (cm)
  diamBiacromial: number | null;
  diamToraxTransverso: number | null;
  diamToraxAnteroposterior: number | null;
  diamBiiliocrestideo: number | null;
  diamHumeral: number | null;
  diamFemoral: number | null;
  // Perímetros (cm)
  circCabeza: number | null;
  circBrazo: number | null;
  circBrazoContraido: number | null;
  circAntebrazo: number | null;
  circTorax: number | null;
  circCinturaMinima: number | null;
  circCadera: number | null;
  circMusloMaximo: number | null;
  circMusloMedial: number | null;
  circPantorrilla: number | null;
  // Pliegues cutáneos (mm)
  pliegueTricipital: number | null;
  pliegueSubescapular: number | null;
  pliegueSupraespinal: number | null;
  pliegueAbdominal: number | null;
  pliegueMuslo: number | null;
  plieguePantorrilla: number | null;
  /**
   * Bicipital y cresta ilíaca no entran en el fraccionamiento de Kerr, pero
   * sí en el modelo de 2 componentes: Withers (varones) pide el bicipital y
   * Durnin & Womersley pide los dos.
   */
  pliegueBicipital: number | null;
  pliegueCrestaIliaca: number | null;
}

/** Datos del paciente que el cálculo necesita y no vienen de la medición. */
export interface ContextoComposicion {
  sexo: SexoBiologico | null;
  /** Edad en años a la fecha de la medición (decimal). */
  edadAnios: number | null;
  nivelActividad: NivelActividad | null;
}

/** Una de las cinco masas del fraccionamiento. */
export interface ComponenteMasa {
  /** Kg ya re-ajustados para que las cinco masas sumen el peso bruto. */
  kg: number;
  /** Porcentaje sobre el peso estructurado (suma 100 entre las cinco). */
  porcentaje: number;
  /** Índice de masa del componente (kg / talla en m²). */
  indice: number;
  /** Score-Z Phantom del componente (null en la piel: no tiene referencia). */
  scoreZ: number | null;
}

/** Las cinco masas + el control de calidad del fraccionamiento. */
export interface Fraccionamiento {
  adiposa: ComponenteMasa;
  muscular: ComponenteMasa;
  residual: ComponenteMasa;
  osea: ComponenteMasa;
  piel: ComponenteMasa;
  /** Suma de las cinco masas sin ajustar (peso "estructurado" o teórico). */
  pesoEstructuradoKg: number;
  /** Peso estructurado − peso bruto: el error del fraccionamiento. */
  diferenciaKg: number;
  /** El mismo error como fracción del peso bruto (0,02 = 2 %). */
  diferenciaPorcentaje: number;
  /** Masa ósea del cráneo, ya incluida dentro de `osea` (informativa). */
  masaOseaCabezaKg: number;
  /** Masa ósea del resto del esqueleto, ya incluida dentro de `osea`. */
  masaOseaCuerpoKg: number;
}

/** Somatotipo de Heath & Carter con sus coordenadas de somatocarta. */
export interface Somatotipo {
  endomorfia: number;
  mesomorfia: number;
  ectomorfia: number;
  /** Σ de tríceps + subescapular + supraespinal corregida por talla. */
  sumatoriaPliegues: number;
  /** Height-Weight Ratio: talla / raíz cúbica del peso. */
  hwr: number;
  /** Coordenada X de la somatocarta: ecto − endo. */
  x: number;
  /** Coordenada Y de la somatocarta: 2·meso − (endo + ecto). */
  y: number;
}

/** Grupos en los que se ordenan las variables del perfil Phantom. */
export type GrupoPhantom = "BASICOS" | "DIAMETROS" | "PERIMETROS" | "PLIEGUES";

/** Un punto del perfil de proporcionalidad Phantom. */
export interface PuntoPhantom {
  variable: VariablePhantom;
  etiqueta: string;
  grupo: GrupoPhantom;
  /** Valor medido, en su unidad original. */
  valor: number;
  /** Valor escalado a la talla del Phantom (170,18 cm). */
  valorAjustado: number;
  /** Desvíos estándar respecto del Phantom: 0 = idéntico a la referencia. */
  scoreZ: number;
}

export const RIESGOS_CINTURA_CADERA = [
  "BAJO",
  "MODERADO",
  "ALTO",
  "MUY_ALTO",
] as const;
export type RiesgoCinturaCadera = (typeof RIESGOS_CINTURA_CADERA)[number];

/** Índices antropométricos derivados. */
export interface IndicesComposicion {
  imc: number | null;
  indiceCinturaCadera: number | null;
  riesgoCinturaCadera: RiesgoCinturaCadera | null;
  sumatoria6Pliegues: number | null;
  indiceMusculoOseo: number | null;
  indiceAdiposoMuscular: number | null;
  /** Talla sentado / talla × 100: proporción tronco-piernas. */
  indiceCormico: number | null;
  /** Índice ponderal: raíz cúbica del peso / talla. */
  indicePonderal: number | null;
  /** Superficie corporal (Du Bois, 1916) en m². */
  superficieCorporalM2: number | null;
  /** Superficie por kg de peso (cm²/kg). */
  superficiePorKg: number | null;
  /** Todo lo que no es músculo, relativo a la talla. */
  indiceLastre: number | null;
  /** Masa muscular / masa no muscular. */
  indiceMuscularLastre: number | null;
}

/** Estimaciones energéticas y de peso de referencia. */
export interface EnergiaComposicion {
  /** Peso ideal OMS (1985): IMC 23 en varones, 21,5 en mujeres. */
  pesoIdealKg: number;
  pesoIdealMinKg: number;
  pesoIdealMaxKg: number;
  /** Peso con el que se calcula el MB (ajustado si hay sobrepeso). */
  pesoParaMetabolismoKg: number;
  /** Masa libre de grasa = peso − masa adiposa (null sin fraccionamiento). */
  masaLibreGrasaKg: number | null;
  /** Harris & Benedict (1919), la fórmula que usa la planilla. */
  metabolismoBasalKcal: number;
  /** Bogardus & Ravussin (1989); necesita masa libre de grasa. */
  metabolismoBogardusKcal: number | null;
  /** Cunningham (1991); necesita masa libre de grasa. */
  metabolismoCunninghamKcal: number | null;
  /** Kleiber (1975), solo sobre el peso. */
  metabolismoKleiberKcal: number;
  /** Factor de actividad OMS; null si no se cargó el nivel. */
  factorActividad: number | null;
  gastoEnergeticoTotalKcal: number | null;
}

/** Bloque que no pudo calcularse y las medidas que le faltan. */
export interface BloqueFaltante {
  bloque: "FRACCIONAMIENTO" | "SOMATOTIPO" | "ENERGIA" | "INDICES";
  campos: string[];
}

/** Resultado completo del análisis de una medición. */
export interface ResultadoComposicion {
  fraccionamiento: Fraccionamiento | null;
  somatotipo: Somatotipo | null;
  phantom: PuntoPhantom[];
  indices: IndicesComposicion;
  energia: EnergiaComposicion | null;
  /**
   * Modelo de 2 componentes: el porcentaje graso según cada ecuación de
   * pliegues que las medidas permitan. Convive con el fraccionamiento en 5
   * masas, pero NO se mezcla con él: miden cosas distintas.
   */
  grasaPorPliegues: GrasaPorPliegues;
  faltantes: BloqueFaltante[];
}

// --- Tablas de referencia -----------------------------------------------------

/** Grosor de piel (mm) del modelo de Kerr, por sexo. */
const GROSOR_PIEL: Record<SexoBiologico, number> = {
  MASCULINO: 2.07,
  FEMENINO: 1.96,
};

/** Constante de superficie corporal por sexo; 70,691 para menores de 12 años. */
const CONSTANTE_SUPERFICIE: Record<SexoBiologico, number> = {
  MASCULINO: 68.308,
  FEMENINO: 73.074,
};
const CONSTANTE_SUPERFICIE_INFANTIL = 70.691;

/** Factores de actividad física (OMS, 1985). */
const FACTOR_ACTIVIDAD: Record<
  NivelActividad,
  Record<SexoBiologico, number>
> = {
  SEDENTARIA: { MASCULINO: 1.3, FEMENINO: 1.3 },
  LIVIANA: { MASCULINO: 1.6, FEMENINO: 1.5 },
  MODERADA: { MASCULINO: 1.7, FEMENINO: 1.6 },
  INTENSA: { MASCULINO: 2.1, FEMENINO: 1.9 },
  EXTREMADA: { MASCULINO: 2.4, FEMENINO: 2.2 },
};

// Las tablas de referencia y los rótulos viven en ./composicion/, pero este
// módulo sigue siendo el punto de entrada: lo importan 20+ archivos.
export * from "./composicion/referenciasPhantom";
export * from "./composicion/etiquetasMedida";

import {
  VARIABLES_PHANTOM,
  REFERENCIAS_PHANTOM,
  type VariablePhantom,
} from "./composicion/referenciasPhantom";
import { ETIQUETAS_MEDIDA } from "./composicion/etiquetasMedida";

/**
 * Umbrales del índice cintura/cadera por sexo y década de edad (Bray, 1992).
 * Cada fila es [edadMáxima, bajo, moderado, alto]; por encima del último
 * umbral el riesgo es MUY_ALTO.
 */
const UMBRALES_ICC: Record<
  SexoBiologico,
  readonly (readonly [number, number, number, number])[]
> = {
  MASCULINO: [
    [29, 0.83, 0.88, 0.94],
    [39, 0.84, 0.91, 0.96],
    [49, 0.88, 0.95, 1.0],
    [59, 0.9, 0.96, 1.02],
    [Infinity, 0.91, 0.98, 1.03],
  ],
  FEMENINO: [
    [29, 0.71, 0.77, 0.82],
    [39, 0.72, 0.78, 0.84],
    [49, 0.73, 0.79, 0.87],
    [59, 0.74, 0.81, 0.88],
    [Infinity, 0.76, 0.83, 0.9],
  ],
};

/** Medidas mínimas para que el fraccionamiento en 5 masas sea posible. */
const REQUERIDOS_FRACCIONAMIENTO = [
  "tallaSentadoCm",
  "diamBiacromial",
  "diamToraxTransverso",
  "diamToraxAnteroposterior",
  "diamBiiliocrestideo",
  "diamHumeral",
  "diamFemoral",
  "circCabeza",
  "circBrazo",
  "circAntebrazo",
  "circTorax",
  "circCinturaMinima",
  "circMusloMaximo",
  "circPantorrilla",
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
] as const satisfies readonly (keyof MedidasComposicion)[];

/** Medidas mínimas para el somatotipo de Heath & Carter. */
const REQUERIDOS_SOMATOTIPO = [
  "tallaCm",
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "plieguePantorrilla",
  "diamHumeral",
  "diamFemoral",
  "circBrazoContraido",
  "circPantorrilla",
] as const satisfies readonly (keyof MedidasComposicion)[];

// --- Cálculo ------------------------------------------------------------------

/**
 * Analiza una medición y devuelve todos los resultados que sus medidas
 * permiten calcular. Los bloques incompletos vuelven en `null` y se listan
 * en `faltantes` con las medidas que hacen falta.
 */
export function calcularComposicion(
  medidas: MedidasComposicion,
  contexto: ContextoComposicion,
): ResultadoComposicion {
  const faltantes: BloqueFaltante[] = [];
  const talla = positivo(medidas.tallaCm);
  // Factor de escalado Phantom: cuánto habría que estirar o encoger al sujeto.
  const k = talla != null ? TALLA_PHANTOM / talla : null;

  const fraccionamiento = calcularFraccionamiento(
    medidas,
    contexto,
    k,
    faltantes,
  );
  const somatotipo = calcularSomatotipo(medidas, faltantes);
  const phantom = k != null ? calcularPhantom(medidas, k) : [];
  const indices = calcularIndices(medidas, contexto, fraccionamiento);
  const energia = calcularEnergia(
    medidas,
    contexto,
    fraccionamiento,
    faltantes,
  );

  // El modelo de 2 componentes lleva su propia lista de faltantes, por método:
  // con los mismos pliegues uno puede resolverse y otro no.
  const grasaPorPliegues = calcularGrasaPorPliegues(medidas, contexto);

  if (talla == null) {
    faltantes.push({ bloque: "INDICES", campos: [ETIQUETAS_MEDIDA.tallaCm] });
  }

  return {
    fraccionamiento,
    somatotipo,
    phantom,
    indices,
    energia,
    grasaPorPliegues,
    faltantes,
  };
}

/**
 * Fraccionamiento en 5 componentes de Kerr: cada masa sale de su propio
 * Score-Z Phantom y después se prorratea el error contra el peso bruto, de
 * modo que las cinco sumen exactamente lo que marcó la balanza.
 */
function calcularFraccionamiento(
  m: MedidasComposicion,
  contexto: ContextoComposicion,
  k: number | null,
  faltantes: BloqueFaltante[],
): Fraccionamiento | null {
  const faltan: string[] = [];
  if (k == null) faltan.push(ETIQUETAS_MEDIDA.tallaCm);
  if (contexto.sexo == null) faltan.push("Sexo biológico del paciente");
  for (const campo of REQUERIDOS_FRACCIONAMIENTO) {
    if (positivo(m[campo]) == null) faltan.push(ETIQUETAS_MEDIDA[campo]);
  }

  const talla = positivo(m.tallaCm);
  const tallaSentado = positivo(m.tallaSentadoCm);
  if (faltan.length > 0 || k == null || talla == null || tallaSentado == null) {
    faltantes.push({ bloque: "FRACCIONAMIENTO", campos: faltan });
    return null;
  }
  const sexo = contexto.sexo;
  if (sexo == null) {
    faltantes.push({ bloque: "FRACCIONAMIENTO", campos: faltan });
    return null;
  }

  const peso = m.pesoKg;
  const cubo = k ** 3;

  // 1. Piel: superficie corporal por el grosor medio del tegumento.
  const constante =
    contexto.edadAnios != null && contexto.edadAnios < 12
      ? CONSTANTE_SUPERFICIE_INFANTIL
      : CONSTANTE_SUPERFICIE[sexo];
  const areaSuperficial = (constante * peso ** 0.425 * talla ** 0.725) / 10000;
  const masaPiel = areaSuperficial * GROSOR_PIEL[sexo] * 1.05;

  // 2. Adiposa: Σ de los 6 pliegues.
  const suma6 =
    m.pliegueTricipital! +
    m.pliegueSubescapular! +
    m.pliegueSupraespinal! +
    m.pliegueAbdominal! +
    m.pliegueMuslo! +
    m.plieguePantorrilla!;
  const zAdiposa = (suma6 * k - 116.41) / 34.79;
  const masaAdiposa = (zAdiposa * 5.85 + 25.6) / cubo;

  // 3. Muscular: perímetros descontando el pliegue del mismo segmento.
  const perimetroBrazo = m.circBrazo! - (m.pliegueTricipital! * 3.141) / 10;
  const perimetroAntebrazo = m.circAntebrazo!;
  const perimetroMuslo = m.circMusloMaximo! - (m.pliegueMuslo! * 3.141) / 10;
  const perimetroPantorrilla =
    m.circPantorrilla! - (m.plieguePantorrilla! * 3.141) / 10;
  const perimetroTorax = m.circTorax! - (m.pliegueSubescapular! * 3.141) / 10;
  const sumaPerimetros =
    perimetroBrazo +
    perimetroAntebrazo +
    perimetroMuslo +
    perimetroPantorrilla +
    perimetroTorax;
  const zMuscular = (sumaPerimetros * k - 207.21) / 13.74;
  const masaMuscular = (zMuscular * 5.4 + 24.5) / cubo;

  // 4. Residual (vísceras): escala por talla sentado, no por talla total.
  const kResidual = TALLA_SENTADO_PHANTOM / tallaSentado;
  const cinturaCorregida = m.circCinturaMinima! - m.pliegueAbdominal! * 0.3141;
  const sumaTorax =
    m.diamToraxTransverso! + m.diamToraxAnteroposterior! + cinturaCorregida;
  const zResidual = (sumaTorax * kResidual - 109.35) / 7.08;
  const masaResidual = (zResidual * 1.24 + 6.1) / kResidual ** 3;

  // 5. Ósea: cráneo aparte (no escala con la talla) + resto del esqueleto.
  const zCabeza = (m.circCabeza! - 56) / 1.44;
  const masaOseaCabeza = zCabeza * 0.18 + 1.2;
  const sumaDiametros =
    m.diamBiacromial! +
    m.diamBiiliocrestideo! +
    m.diamHumeral! * 2 +
    m.diamFemoral! * 2;
  const zOsea = (sumaDiametros * k - 98.88) / 5.33;
  const masaOseaCuerpo = (zOsea * 1.34 + 6.7) / cubo;

  const pesoEstructurado =
    masaPiel +
    masaAdiposa +
    masaMuscular +
    masaResidual +
    masaOseaCabeza +
    masaOseaCuerpo;
  const diferencia = pesoEstructurado - peso;

  // Prorrateo: el error se reparte según el peso relativo de cada masa, para
  // que las cinco ajustadas sumen el peso de la balanza.
  const ajustar = (masa: number): number =>
    masa - diferencia * (masa / pesoEstructurado);
  const masaOseaTotal = masaOseaCabeza + masaOseaCuerpo;
  const areaTalla = (talla / 100) ** 2;

  const componente = (masa: number, scoreZ: number | null): ComponenteMasa => ({
    kg: redondear(ajustar(masa), 3),
    porcentaje: redondear((masa / pesoEstructurado) * 100, 2),
    indice: redondear(ajustar(masa) / areaTalla, 3),
    scoreZ: scoreZ == null ? null : redondear(scoreZ, 3),
  });

  return {
    adiposa: componente(masaAdiposa, zAdiposa),
    muscular: componente(masaMuscular, zMuscular),
    residual: componente(masaResidual, zResidual),
    osea: componente(masaOseaTotal, zOsea),
    piel: componente(masaPiel, null),
    pesoEstructuradoKg: redondear(pesoEstructurado, 3),
    diferenciaKg: redondear(diferencia, 3),
    diferenciaPorcentaje: redondear(diferencia / peso, 5),
    masaOseaCabezaKg: redondear(ajustar(masaOseaCabeza), 3),
    masaOseaCuerpoKg: redondear(ajustar(masaOseaCuerpo), 3),
  };
}

/** Somatotipo de Heath & Carter (1990). */
function calcularSomatotipo(
  m: MedidasComposicion,
  faltantes: BloqueFaltante[],
): Somatotipo | null {
  const faltan = REQUERIDOS_SOMATOTIPO.filter(
    (campo) => positivo(m[campo]) == null,
  ).map((campo) => ETIQUETAS_MEDIDA[campo]);
  const talla = positivo(m.tallaCm);
  if (faltan.length > 0 || talla == null) {
    faltantes.push({ bloque: "SOMATOTIPO", campos: faltan });
    return null;
  }

  const sumatoria =
    (m.pliegueTricipital! + m.pliegueSubescapular! + m.pliegueSupraespinal!) *
    (TALLA_PHANTOM / talla);
  const endomorfia =
    -0.7182 +
    0.1451 * sumatoria -
    0.00068 * sumatoria ** 2 +
    0.0000014 * sumatoria ** 3;

  const brazoCorregido = m.circBrazoContraido! - m.pliegueTricipital! / 10;
  const pantorrillaCorregida = m.circPantorrilla! - m.plieguePantorrilla! / 10;
  const mesomorfia =
    0.858 * m.diamHumeral! +
    0.601 * m.diamFemoral! +
    0.188 * brazoCorregido +
    0.161 * pantorrillaCorregida -
    talla * 0.131 +
    4.5;

  const hwr = talla / m.pesoKg ** 0.3333;
  const ectomorfia =
    hwr <= 38.25
      ? 0.1
      : hwr < 40.75
        ? 0.463 * hwr - 17.63
        : 0.732 * hwr - 28.58;

  return {
    endomorfia: redondear(endomorfia, 2),
    mesomorfia: redondear(mesomorfia, 2),
    ectomorfia: redondear(ectomorfia, 2),
    sumatoriaPliegues: redondear(sumatoria, 3),
    hwr: redondear(hwr, 3),
    x: redondear(ectomorfia - endomorfia, 3),
    y: redondear(2 * mesomorfia - (endomorfia + ectomorfia), 3),
  };
}

/**
 * Perfil de proporcionalidad Phantom: lleva cada medida a la talla de
 * referencia y la expresa en desvíos estándar del humano unisex.
 */
function calcularPhantom(m: MedidasComposicion, k: number): PuntoPhantom[] {
  const puntos: PuntoPhantom[] = [];
  for (const variable of VARIABLES_PHANTOM) {
    const valor = positivo(m[variable]);
    if (valor == null) continue;
    const referencia = REFERENCIAS_PHANTOM[variable];
    const factor =
      referencia.escala === "cubica"
        ? k ** 3
        : referencia.escala === "cabeza"
          ? 1
          : k;
    const valorAjustado = valor * factor;
    puntos.push({
      variable,
      etiqueta: referencia.etiqueta,
      grupo: referencia.grupo,
      valor,
      valorAjustado: redondear(valorAjustado, 3),
      scoreZ: redondear(
        (valorAjustado - referencia.media) / referencia.desvio,
        3,
      ),
    });
  }
  return puntos;
}

/** Índices: cada uno se calcula si están sus medidas, sin bloquear a los demás. */
function calcularIndices(
  m: MedidasComposicion,
  contexto: ContextoComposicion,
  fraccionamiento: Fraccionamiento | null,
): IndicesComposicion {
  const talla = positivo(m.tallaCm);
  const tallaSentado = positivo(m.tallaSentadoCm);
  const cintura = positivo(m.circCinturaMinima);
  const cadera = positivo(m.circCadera);

  const icc = cintura != null && cadera != null ? cintura / cadera : null;
  const superficie =
    talla != null ? 0.007184 * m.pesoKg ** 0.425 * talla ** 0.725 : null;

  const pliegues6 = [
    m.pliegueTricipital,
    m.pliegueSubescapular,
    m.pliegueSupraespinal,
    m.pliegueAbdominal,
    m.pliegueMuslo,
    m.plieguePantorrilla,
  ].map(positivo);
  const suma6 = pliegues6.every((p) => p != null)
    ? pliegues6.reduce((total: number, p) => total + p, 0)
    : null;

  const muscular = fraccionamiento?.muscular.kg ?? null;
  const noMuscular = muscular != null ? m.pesoKg - muscular : null;

  return {
    imc: talla != null ? redondear(m.pesoKg / (talla / 100) ** 2, 2) : null,
    indiceCinturaCadera: icc != null ? redondear(icc, 3) : null,
    riesgoCinturaCadera:
      icc != null
        ? clasificarRiesgoIcc(icc, contexto.sexo, contexto.edadAnios)
        : null,
    sumatoria6Pliegues: suma6 != null ? redondear(suma6, 1) : null,
    indiceMusculoOseo:
      fraccionamiento != null
        ? redondear(fraccionamiento.muscular.kg / fraccionamiento.osea.kg, 3)
        : null,
    indiceAdiposoMuscular:
      fraccionamiento != null
        ? redondear(fraccionamiento.adiposa.kg / fraccionamiento.muscular.kg, 3)
        : null,
    indiceCormico:
      talla != null && tallaSentado != null
        ? redondear((tallaSentado / talla) * 100, 2)
        : null,
    indicePonderal:
      talla != null ? redondear(m.pesoKg ** 0.3333 / talla, 4) : null,
    superficieCorporalM2: superficie != null ? redondear(superficie, 3) : null,
    superficiePorKg:
      superficie != null ? redondear((superficie * 10000) / m.pesoKg, 2) : null,
    indiceLastre:
      noMuscular != null && talla != null
        ? redondear((noMuscular * 1000) / talla ** 2, 4)
        : null,
    indiceMuscularLastre:
      muscular != null && noMuscular != null && noMuscular > 0
        ? redondear(muscular / noMuscular, 3)
        : null,
  };
}

/** Riesgo cardiovascular asociado al índice cintura/cadera (Bray, 1992). */
function clasificarRiesgoIcc(
  icc: number,
  sexo: SexoBiologico | null,
  edad: number | null,
): RiesgoCinturaCadera | null {
  if (sexo == null || edad == null) return null;
  const fila = UMBRALES_ICC[sexo].find(([edadMaxima]) => edad <= edadMaxima);
  if (!fila) return null;
  const [, bajo, moderado, alto] = fila;
  if (icc < bajo) return "BAJO";
  if (icc <= moderado) return "MODERADO";
  if (icc <= alto) return "ALTO";
  return "MUY_ALTO";
}

/**
 * Peso ideal, metabolismo basal y gasto energético total.
 * Con sobrepeso el MB se calcula sobre el peso ideal más el 25 % del
 * excedente: es la corrección de la planilla, porque ese tejido extra
 * también consume energía.
 */
function calcularEnergia(
  m: MedidasComposicion,
  contexto: ContextoComposicion,
  fraccionamiento: Fraccionamiento | null,
  faltantes: BloqueFaltante[],
): EnergiaComposicion | null {
  const talla = positivo(m.tallaCm);
  const { sexo, edadAnios } = contexto;
  const faltan: string[] = [];
  if (talla == null) faltan.push(ETIQUETAS_MEDIDA.tallaCm);
  if (sexo == null) faltan.push("Sexo biológico del paciente");
  if (edadAnios == null) faltan.push("Fecha de nacimiento del paciente");
  if (talla == null || sexo == null || edadAnios == null) {
    faltantes.push({ bloque: "ENERGIA", campos: faltan });
    return null;
  }

  const pesoIdeal = (talla / 100) ** 2 * (sexo === "MASCULINO" ? 23 : 21.5);
  const excedente = m.pesoKg - pesoIdeal;
  const pesoParaMB =
    m.pesoKg < pesoIdeal ? m.pesoKg : pesoIdeal + excedente * 0.25;

  const metabolismoBasal =
    sexo === "MASCULINO"
      ? 66 + 13.7 * pesoParaMB + 5 * talla - 6.8 * edadAnios
      : 655 + 9.6 * pesoParaMB + 1.7 * talla - 4.7 * edadAnios;

  const masaLibreGrasa =
    fraccionamiento != null ? m.pesoKg - fraccionamiento.adiposa.kg : null;
  const factor =
    contexto.nivelActividad != null
      ? FACTOR_ACTIVIDAD[contexto.nivelActividad][sexo]
      : null;

  return {
    pesoIdealKg: redondear(pesoIdeal, 2),
    pesoIdealMinKg: redondear(pesoIdeal * 0.9, 2),
    pesoIdealMaxKg: redondear(pesoIdeal * 1.1, 2),
    pesoParaMetabolismoKg: redondear(pesoParaMB, 2),
    masaLibreGrasaKg:
      masaLibreGrasa != null ? redondear(masaLibreGrasa, 3) : null,
    metabolismoBasalKcal: redondear(metabolismoBasal, 1),
    metabolismoBogardusKcal:
      masaLibreGrasa != null ? redondear(21.8 * masaLibreGrasa + 392, 1) : null,
    metabolismoCunninghamKcal:
      masaLibreGrasa != null ? redondear(370 + 21.6 * masaLibreGrasa, 1) : null,
    metabolismoKleiberKcal: redondear(67.6 * m.pesoKg ** 0.75, 1),
    factorActividad: factor,
    gastoEnergeticoTotalKcal:
      factor != null ? redondear(metabolismoBasal * factor, 1) : null,
  };
}

// --- Utilidades ---------------------------------------------------------------

/** Trata 0, null y valores no finitos como "no medido". */
function positivo(valor: number | null | undefined): number | null {
  return valor != null && Number.isFinite(valor) && valor > 0 ? valor : null;
}

function redondear(valor: number, decimales: number): number {
  if (!Number.isFinite(valor)) return 0;
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}
