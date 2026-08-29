import {
  definicionVariable,
  type VariableComposicion,
} from "../entidades/ObjetivoComposicion";
import {
  calcularComposicion,
  ETIQUETAS_MEDIDA,
  type ContextoComposicion,
  type MedidasComposicion,
  type ResultadoComposicion,
} from "./composicionCorporal";
import {
  DEFINICIONES_METODO,
  PLIEGUE_MINIMO_MM,
  type MetodoGrasa,
  type PlieguePlaneado,
  type ProyeccionPliegues,
} from "./grasaPorPliegues";

/**
 * Proyección de objetivos de composición corporal — cálculo puro.
 *
 * Dada la serie histórica de una variable y la meta del profesional, responde
 * las tres preguntas del dashboard: cuánto falta, a qué ritmo viene el
 * paciente y si con ese ritmo llega a la fecha planteada.
 *
 * El ritmo sale de una regresión lineal por mínimos cuadrados sobre TODA la
 * serie, no de restar la primera y la última medición: una consulta con el
 * paciente deshidratado o recién comido movería la pendiente entera.
 */

/** Un punto de la serie histórica de una variable. */
export interface PuntoSerie {
  fecha: Date;
  valor: number;
}

/** Cómo viene la marcha hacia la meta. */
export const ESTADOS_PROYECCION = [
  /** Menos de dos mediciones: no hay pendiente que estimar. */
  "SIN_DATOS",
  /** Ya se alcanzó (o se superó) el valor objetivo. */
  "ALCANZADO",
  /** Con el ritmo actual llega en fecha (o no hay fecha y va en la dirección correcta). */
  "EN_CAMINO",
  /** Se acerca a la meta, pero más lento de lo que la fecha exige. */
  "ATRASADO",
  /** Se está moviendo en la dirección contraria a la meta. */
  "ALEJANDOSE",
  /** La fecha objetivo ya pasó y la meta no se alcanzó. */
  "VENCIDO",
] as const;
export type EstadoProyeccion = (typeof ESTADOS_PROYECCION)[number];

/** Todo lo que el dashboard necesita para dibujar un objetivo. */
export interface ProyeccionObjetivo {
  variable: VariableComposicion;
  etiqueta: string;
  unidad: string;
  valorObjetivo: number;
  fechaObjetivo: Date | null;
  /** Primer valor de la serie: el punto de partida contra el que se mide. */
  valorInicial: number | null;
  fechaInicial: Date | null;
  /** Último valor medido. */
  valorActual: number | null;
  fechaActual: Date | null;
  /** Objetivo − actual: lo que falta, con signo (negativo = hay que bajar). */
  brecha: number | null;
  /** Porción del camino inicial → objetivo ya recorrida, de 0 a 100. */
  progresoPorcentaje: number | null;
  /** Cambio observado por semana (pendiente de la regresión). */
  ritmoSemanal: number | null;
  /**
   * El ritmo se estimó con mediciones ANTERIORES a la meta, porque todavía no
   * hay dos posteriores. Sirve para proyectar —es cómo viene el paciente—
   * pero la UI tiene que decirlo: no es progreso hacia esta meta.
   */
  ritmoPrevioALaMeta: boolean;
  /** Cambio por semana que haría falta desde hoy para llegar en fecha. */
  ritmoSemanalNecesario: number | null;
  /** Fecha estimada de llegada manteniendo el ritmo actual. */
  fechaProyectada: Date | null;
  /** Valor estimado a la fecha objetivo manteniendo el ritmo actual. */
  valorProyectadoAFecha: number | null;
  estado: EstadoProyeccion;
}

const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

/**
 * Ventana para estimar el ritmo cuando todas las mediciones son anteriores a
 * la meta. Se acota por TIEMPO y no por cantidad: "las últimas tres" puede
 * incluir una de hace ocho meses, que aplana la pendiente igual que la
 * historia entera. Seis meses es lo que suele durar un tratamiento.
 */
const VENTANA_RITMO_PREVIO_MESES = 6;

/**
 * Tolerancia relativa para dar una meta por alcanzada. Sin ella, un objetivo
 * de 12,0 kg con una medición de 11,999 kg quedaría eternamente "en curso".
 */
const TOLERANCIA_RELATIVA = 0.005;

/**
 * Proyecta un objetivo sobre la serie histórica de su variable.
 * `serie` debe venir ordenada por fecha ascendente y sin huecos (los valores
 * null se filtran antes: una medición sin esa variable no participa).
 *
 * El punto de partida NO es la primera medición del paciente sino la vigente
 * cuando se planteó la meta. Con historia previa la diferencia es enorme: un
 * paciente que venía de 30 kg y estaba en 20 al acordar bajar a 15 aparecía
 * con 77 % del camino hecho antes de empezar. El progreso mide lo que pasó
 * desde que la meta existe; el estado, en cambio, se lee siempre contra la
 * última medición, que es dónde está hoy.
 */
export function proyectarObjetivo(
  objetivo: {
    variable: VariableComposicion;
    valorObjetivo: number;
    fechaObjetivo: Date | null;
    /** Cuándo se planteó la meta: define el punto de partida. */
    creadoEn?: Date | null;
  },
  serie: readonly PuntoSerie[],
  ahora: Date = new Date(),
): ProyeccionObjetivo {
  const { etiqueta, unidad, min, max } = definicionVariable(objetivo.variable);
  const base: ProyeccionObjetivo = {
    variable: objetivo.variable,
    etiqueta,
    unidad,
    valorObjetivo: objetivo.valorObjetivo,
    fechaObjetivo: objetivo.fechaObjetivo,
    valorInicial: null,
    fechaInicial: null,
    valorActual: null,
    fechaActual: null,
    brecha: null,
    progresoPorcentaje: null,
    ritmoSemanal: null,
    ritmoPrevioALaMeta: false,
    ritmoSemanalNecesario: null,
    fechaProyectada: null,
    valorProyectadoAFecha: null,
    estado: "SIN_DATOS",
  };

  const todos = [...serie].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime(),
  );
  const ultimo = todos[todos.length - 1];
  if (!ultimo) return base;

  // Partida: la última medición anterior o igual a la fecha en que se planteó
  // la meta. Si la meta es más vieja que toda la historia, la primera medición.
  const creadoEn = objetivo.creadoEn ?? null;
  const primero =
    (creadoEn != null
      ? [...todos]
          .reverse()
          .find((p) => p.fecha.getTime() <= creadoEn.getTime())
      : todos[0]) ?? todos[0]!;

  // Para el ritmo, lo medido desde la partida. Mezclar años previos aplana la
  // pendiente y proyecta una llegada que no corresponde.
  const desdePartida = todos.filter(
    (p) => p.fecha.getTime() >= primero.fecha.getTime(),
  );

  // Caso habitual en consulta: el paciente ya tenía mediciones y la meta se
  // plantea hoy, así que no hay dos puntos posteriores. El ritmo con el que
  // viene igual se conoce y es lo que interesa proyectar; se estima con las
  // últimas mediciones (no con toda la historia, que aplanaría) y se marca
  // como previo para que la UI no lo presente como avance hacia la meta.
  const previo = desdePartida.length < 2 && todos.length >= 2;
  const puntos = previo ? recientes(todos) : desdePartida;

  const brecha = objetivo.valorObjetivo - ultimo.valor;
  const recorridoTotal = objetivo.valorObjetivo - primero.valor;

  // Progreso: qué fracción del camino planteado ya se hizo. Si el objetivo
  // coincidía con el valor de partida no hay camino, y el progreso es 100.
  const progreso =
    Math.abs(recorridoTotal) < 1e-9
      ? 100
      : limitar(
          ((ultimo.valor - primero.valor) / recorridoTotal) * 100,
          0,
          100,
        );

  const alcanzado =
    Math.abs(brecha) <=
      Math.abs(objetivo.valorObjetivo) * TOLERANCIA_RELATIVA ||
    // También cuenta como alcanzado haberse pasado de largo en la dirección
    // buscada: bajar a 11 kg cuando la meta era 12 kg es cumplir.
    (recorridoTotal !== 0 && Math.sign(brecha) !== Math.sign(recorridoTotal));

  const ritmoSemanal = calcularRitmoSemanal(puntos);
  const semanasHastaFecha =
    objetivo.fechaObjetivo != null
      ? (objetivo.fechaObjetivo.getTime() - ahora.getTime()) / MS_POR_SEMANA
      : null;
  const ritmoNecesario =
    semanasHastaFecha != null && semanasHastaFecha > 0
      ? brecha / semanasHastaFecha
      : null;

  let fechaProyectada: Date | null = null;
  let valorProyectado: number | null = null;
  if (ritmoSemanal != null && Math.abs(ritmoSemanal) > 1e-9) {
    const semanasNecesarias = brecha / ritmoSemanal;
    if (semanasNecesarias > 0 && semanasNecesarias < 520) {
      fechaProyectada = new Date(
        ultimo.fecha.getTime() + semanasNecesarias * MS_POR_SEMANA,
      );
    }
    if (semanasHastaFecha != null) {
      const semanasDesdeUltima =
        (objetivo.fechaObjetivo!.getTime() - ultimo.fecha.getTime()) /
        MS_POR_SEMANA;
      const extrapolado = ultimo.valor + ritmoSemanal * semanasDesdeUltima;
      // Una recta no tiene tope biológico: extrapolar meses hacia adelante
      // llega a un 0 % de grasa o a pesos imposibles. Cuando el resultado se
      // sale del rango admisible de la variable, la proyección deja de
      // significar algo y es más honesto no darla.
      valorProyectado =
        extrapolado >= min && extrapolado <= max
          ? redondear(extrapolado, 2)
          : null;
    }
  }

  return {
    ...base,
    valorInicial: primero.valor,
    fechaInicial: primero.fecha,
    valorActual: ultimo.valor,
    fechaActual: ultimo.fecha,
    brecha: redondear(brecha, 2),
    progresoPorcentaje: redondear(progreso, 1),
    ritmoSemanal: ritmoSemanal != null ? redondear(ritmoSemanal, 3) : null,
    ritmoPrevioALaMeta: previo && ritmoSemanal != null,
    ritmoSemanalNecesario:
      ritmoNecesario != null ? redondear(ritmoNecesario, 3) : null,
    fechaProyectada,
    valorProyectadoAFecha: valorProyectado,
    estado: clasificar({
      alcanzado,
      brecha,
      ritmoSemanal,
      ritmoNecesario,
      hayFecha: objetivo.fechaObjetivo != null,
      // Una fecha ya pasada no deja "ritmo necesario" que calcular: sin esto
      // un objetivo vencido seguiría anunciándose como "en camino".
      vencido: semanasHastaFecha != null && semanasHastaFecha <= 0,
    }),
  };
}

/**
 * Mediciones de la ventana reciente, con un mínimo de dos: si en esos meses
 * solo hubo una consulta, se toma también la anterior para tener pendiente.
 */
function recientes(todos: readonly PuntoSerie[]): PuntoSerie[] {
  const ultima = todos[todos.length - 1]!;
  const desde = new Date(ultima.fecha);
  desde.setMonth(desde.getMonth() - VENTANA_RITMO_PREVIO_MESES);

  const enVentana = todos.filter((p) => p.fecha.getTime() >= desde.getTime());
  return enVentana.length >= 2 ? enVentana : todos.slice(-2);
}

function clasificar(datos: {
  alcanzado: boolean;
  brecha: number;
  ritmoSemanal: number | null;
  ritmoNecesario: number | null;
  hayFecha: boolean;
  vencido: boolean;
}): EstadoProyeccion {
  if (datos.alcanzado) return "ALCANZADO";
  if (datos.vencido) return "VENCIDO";
  if (datos.ritmoSemanal == null) return "SIN_DATOS";

  // Estancado también es "no va hacia la meta": sin movimiento apreciable la
  // brecha no se cierra nunca, y el dashboard tiene que decirlo.
  const avanza =
    Math.abs(datos.ritmoSemanal) > 1e-9 &&
    Math.sign(datos.ritmoSemanal) === Math.sign(datos.brecha);
  if (!avanza) return "ALEJANDOSE";

  if (!datos.hayFecha || datos.ritmoNecesario == null) return "EN_CAMINO";
  // Va en la dirección correcta: alcanza si su ritmo iguala o supera al que
  // la fecha exige (comparados en magnitud, ya sabemos que coinciden en signo).
  return Math.abs(datos.ritmoSemanal) >= Math.abs(datos.ritmoNecesario)
    ? "EN_CAMINO"
    : "ATRASADO";
}

/**
 * Pendiente en unidades por semana por mínimos cuadrados sobre la serie.
 * Devuelve null con menos de dos puntos o si todas las mediciones cayeron el
 * mismo día (no hay eje temporal sobre el que regresar).
 */
function calcularRitmoSemanal(puntos: readonly PuntoSerie[]): number | null {
  if (puntos.length < 2) return null;

  const origen = puntos[0]!.fecha.getTime();
  const semanas = puntos.map(
    (p) => (p.fecha.getTime() - origen) / MS_POR_SEMANA,
  );
  const n = puntos.length;
  const mediaX = semanas.reduce((total, x) => total + x, 0) / n;
  const mediaY = puntos.reduce((total, p) => total + p.valor, 0) / n;

  let numerador = 0;
  let denominador = 0;
  for (let i = 0; i < n; i++) {
    const dx = semanas[i]! - mediaX;
    numerador += dx * (puntos[i]!.valor - mediaY);
    denominador += dx * dx;
  }
  if (denominador < 1e-9) return null;
  return numerador / denominador;
}

function limitar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

function redondear(valor: number, decimales: number): number {
  if (!Number.isFinite(valor)) return 0;
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/**
 * Valor de una variable de composición en una medición ya calculada.
 * Devuelve null cuando esa medición no alcanza para obtenerla (por ejemplo
 * masa muscular sin el fraccionamiento completo): el punto simplemente no
 * entra en la serie y la proyección se hace con los que sí están.
 */
export function valorDeVariable(
  variable: VariableComposicion,
  medidas: MedidasComposicion,
  resultado: ResultadoComposicion,
  /** Ecuación con la que se sigue la meta; solo aplica a las de grasa. */
  metodoGrasa: MetodoGrasa | null = null,
): number | null {
  const f = resultado.fraccionamiento;
  // Las variables de grasa se leen SIEMPRE del método fijado en el objetivo,
  // no del destacado en la medición: si no, la serie cambiaría de fórmula a
  // mitad de camino y el "progreso" sería puro artefacto.
  const grasa =
    metodoGrasa != null
      ? (resultado.grasaPorPliegues.resultados.find(
          (r) => r.metodo === metodoGrasa,
        ) ?? null)
      : null;

  switch (variable) {
    case "PESO":
      return medidas.pesoKg;
    case "MASA_ADIPOSA_KG":
      return f?.adiposa.kg ?? null;
    case "MASA_ADIPOSA_PORCENTAJE":
      return f?.adiposa.porcentaje ?? null;
    case "MASA_MUSCULAR_KG":
      return f?.muscular.kg ?? null;
    case "MASA_MUSCULAR_PORCENTAJE":
      return f?.muscular.porcentaje ?? null;
    case "SUMATORIA_6_PLIEGUES":
      return resultado.indices.sumatoria6Pliegues;
    case "IMC":
      return resultado.indices.imc;
    case "INDICE_CINTURA_CADERA":
      return resultado.indices.indiceCinturaCadera;
    case "PERIMETRO_CINTURA":
      return medidas.circCinturaMinima;
    case "PORCENTAJE_GRASA":
      return grasa?.porcentajeGrasa ?? null;
    case "MASA_GRASA_KG":
      return grasa?.masaGrasaKg ?? null;
  }
}

// --- Pliegues proyectados para una meta ----------------------------------------

/**
 * Variables cuya meta se puede traducir a un objetivo de pliegues.
 *
 * Son las de ADIPOSIDAD, y solo esas. La masa muscular también se mueve al
 * cambiar los pliegues (los perímetros del modelo van corregidos por el
 * pliegue del segmento), pero mostrar "para llegar a 44 kg de músculo tus
 * pliegues tienen que bajar a X" induce a error: el músculo sube entrenando,
 * no adelgazando el pliegue. El peso, directamente, no depende de ellos.
 */
const VARIABLES_PROYECTABLES = [
  "MASA_ADIPOSA_KG",
  "MASA_ADIPOSA_PORCENTAJE",
  "SUMATORIA_6_PLIEGUES",
  "PORCENTAJE_GRASA",
  "MASA_GRASA_KG",
] as const satisfies readonly VariableComposicion[];

/** ¿Esta meta se puede expresar como un objetivo de pliegues? */
export function admiteProyeccionDePliegues(
  variable: VariableComposicion,
): boolean {
  return (VARIABLES_PROYECTABLES as readonly VariableComposicion[]).includes(
    variable,
  );
}

/** Los 6 pliegues del perfil: los que se escalan cuando la meta es de Kerr. */
const PLIEGUES_ADIPOSIDAD = [
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
] as const satisfies readonly (keyof MedidasComposicion)[];

/** Límites del factor de escala y precisión de la búsqueda. */
const FACTOR_MINIMO = 0.05;
const FACTOR_MAXIMO = 3;
const ITERACIONES = 60;

/**
 * Qué pliegues harían falta para alcanzar la meta.
 *
 * Se resuelve NUMÉRICAMENTE y no despejando la ecuación: la masa adiposa de
 * Kerr sale de un Score-Z pero después se prorratea contra el peso bruto, y
 * ese ajuste depende de las otras cuatro masas. No hay forma cerrada. La
 * bisección, en cambio, recalcula la composición completa en cada paso, así
 * que el resultado respeta el modelo entero — y sirve igual para las metas de
 * Kerr y para las de pliegues, con un solo camino de código.
 *
 * El reparto entre sitios es proporcional al de hoy (se escalan todos por el
 * mismo factor). Es una suposición y así está dicho en la UI.
 */
export function proyectarPlieguesParaMeta(
  objetivo: {
    variable: VariableComposicion;
    metodoGrasa: MetodoGrasa | null;
    valorObjetivo: number;
  },
  medidas: MedidasComposicion,
  contexto: ContextoComposicion,
): ProyeccionPliegues | null {
  if (!admiteProyeccionDePliegues(objetivo.variable)) return null;

  // Qué pliegues mueve esta meta: los de la ecuación, o los 6 del perfil
  // cuando la meta es del fraccionamiento de Kerr.
  const campos =
    objetivo.metodoGrasa != null && contexto.sexo != null
      ? DEFINICIONES_METODO[objetivo.metodoGrasa].pliegues(contexto.sexo)
      : PLIEGUES_ADIPOSIDAD;

  const actuales: number[] = [];
  for (const campo of campos) {
    const valor = medidas[campo];
    // Sin todos los pliegues del método no hay reparto que proyectar.
    if (valor == null || valor <= 0) return null;
    actuales.push(valor);
  }

  /** Valor de la variable si todos esos pliegues se escalan por `factor`. */
  const valorCon = (factor: number): number | null => {
    const escaladas: MedidasComposicion = { ...medidas };
    campos.forEach((campo, indice) => {
      escaladas[campo] = actuales[indice]! * factor;
    });
    return valorDeVariable(
      objetivo.variable,
      escaladas,
      calcularComposicion(escaladas, contexto),
      objetivo.metodoGrasa,
    );
  };

  const factor = buscarFactor(valorCon, objetivo.valorObjetivo);
  if (factor == null) return null;

  const pliegues: PlieguePlaneado[] = campos.map((campo, indice) => {
    const actual = actuales[indice]!;
    const objetivoMm = redondear(actual * factor, 1);
    return {
      campo,
      etiqueta: ETIQUETAS_MEDIDA[campo],
      actualMm: actual,
      objetivoMm,
      diferenciaMm: redondear(objetivoMm - actual, 1),
    };
  });

  const sumaActual = actuales.reduce((total, valor) => total + valor, 0);
  return {
    metodo: objetivo.metodoGrasa,
    etiqueta:
      objetivo.metodoGrasa != null
        ? DEFINICIONES_METODO[objetivo.metodoGrasa].etiqueta
        : "los 6 pliegues del perfil",
    sumaActualMm: redondear(sumaActual, 1),
    sumaObjetivoMm: redondear(sumaActual * factor, 1),
    pliegues,
    fueraDeRango: pliegues.some((p) => p.objetivoMm < PLIEGUE_MINIMO_MM),
  };
}

/**
 * Factor de escala que lleva la variable al valor buscado, por bisección.
 *
 * Detecta la dirección evaluando los extremos: la masa adiposa crece con los
 * pliegues, pero nada garantiza el sentido para toda variable futura. Si la
 * meta cae fuera de lo alcanzable escalando pliegues, devuelve null en vez de
 * clavarse en un extremo y dibujar una proyección falsa.
 */
function buscarFactor(
  valorCon: (factor: number) => number | null,
  buscado: number,
): number | null {
  const enMinimo = valorCon(FACTOR_MINIMO);
  const enMaximo = valorCon(FACTOR_MAXIMO);
  if (enMinimo == null || enMaximo == null) return null;

  const creciente = enMaximo > enMinimo;
  const bajo = creciente ? enMinimo : enMaximo;
  const alto = creciente ? enMaximo : enMinimo;
  if (buscado < bajo || buscado > alto) return null;

  let izquierda = FACTOR_MINIMO;
  let derecha = FACTOR_MAXIMO;
  for (let i = 0; i < ITERACIONES; i++) {
    const medio = (izquierda + derecha) / 2;
    const valor = valorCon(medio);
    if (valor == null) return null;
    if (valor < buscado === creciente) izquierda = medio;
    else derecha = medio;
  }
  return (izquierda + derecha) / 2;
}
