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

/** Los dos bordes de una meta que es un rango. */
export interface RangoMeta {
  minimo: number;
  maximo: number;
}

/**
 * Lo que se busca: un VALOR o un RANGO, nunca los dos.
 *
 * Son dos lecturas distintas y no una con tolerancia. Un valor es un «hasta
 * acá» con dirección: bajar a 11 kg cuando la meta era 12 es cumplir. Un
 * rango es un «quedarse entre»: pasarse del otro borde NO es cumplir, porque
 * hay variables en las que alejarse de más es tan malo como no llegar (un %
 * graso demasiado bajo, una masa ósea que no se mueve a voluntad).
 */
export type MetaNumerica =
  | { valorObjetivo: number; rango?: null }
  | { valorObjetivo?: null; rango: RangoMeta };

/**
 * El valor hacia el que se mide hoy: el de la meta o, con un rango, el punto
 * del rango más cercano al valor actual (el borde que falta cruzar, o el
 * propio valor si ya está adentro). Es lo que mueven los pliegues
 * proyectados y la torta de masas: para entrar al rango alcanza con llegar
 * al borde, no al medio.
 */
export function valorBuscado(meta: MetaNumerica, actual: number): number {
  if (meta.rango == null) return meta.valorObjetivo;
  return limitar(actual, meta.rango.minimo, meta.rango.maximo);
}

/** ¿El valor está dentro del rango? Con la misma tolerancia que «alcanzado». */
export function dentroDelRango(rango: RangoMeta, valor: number): boolean {
  const holgura =
    Math.max(Math.abs(rango.minimo), Math.abs(rango.maximo)) *
    TOLERANCIA_RELATIVA;
  return valor >= rango.minimo - holgura && valor <= rango.maximo + holgura;
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
  /**
   * Se está moviendo en la dirección contraria a la meta: la tendencia va al
   * revés (o no se mueve), o la última medición quedó más lejos que la de
   * partida o que la anterior (`retroceso`).
   */
  "ALEJANDOSE",
  /** La fecha objetivo ya pasó y la meta no se alcanzó. */
  "VENCIDO",
] as const;
export type EstadoProyeccion = (typeof ESTADOS_PROYECCION)[number];

/**
 * Contra qué medición quedó más lejos de la meta la última: la de partida
 * (hoy está peor que cuando se planteó) o la anterior (el último paso fue
 * para atrás).
 */
export type RetrocesoMeta = "DESDE_EL_INICIO" | "DESDE_LA_ANTERIOR";

/**
 * Todo lo que el dashboard necesita para dibujar un objetivo.
 *
 * Es genérica en la variable porque la matemática no depende de QUÉ se mide:
 * la usan las metas de la antropometría y las de la bioimpedancia, que son
 * dos juegos de variables distintos sobre la misma regla de proyección.
 */
export interface ProyeccionMeta<V extends string = string> {
  variable: V;
  etiqueta: string;
  unidad: string;
  /** La meta de un valor; null cuando la meta es un rango. */
  valorObjetivo: number | null;
  /** La meta de un rango; null cuando la meta es un valor. */
  rango: RangoMeta | null;
  fechaObjetivo: Date | null;
  /** Primer valor de la serie: el punto de partida contra el que se mide. */
  valorInicial: number | null;
  fechaInicial: Date | null;
  /** Último valor medido. */
  valorActual: number | null;
  fechaActual: Date | null;
  /**
   * Objetivo − actual: lo que falta, con signo (negativo = hay que bajar).
   * Con un rango, lo que falta hasta el borde más cercano (0 si ya está
   * adentro).
   */
  brecha: number | null;
  /**
   * Porción del camino inicial → objetivo ya recorrida, de 0 a 100. Con un
   * rango, cuánto se acortó la distancia al rango desde la partida: 100 es
   * estar adentro.
   */
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
  /**
   * La última medición quedó más lejos de la meta que la de partida o que la
   * anterior; null si no, o si la meta ya se alcanzó. Con retroceso el
   * estado es ALEJANDOSE (salvo VENCIDO) aunque la tendencia apunte a la
   * meta, así que la UI tiene que decir por qué.
   */
  retroceso: RetrocesoMeta | null;
  estado: EstadoProyeccion;
}

/** La proyección de una meta de antropometría. */
export type ProyeccionObjetivo = ProyeccionMeta<VariableComposicion>;

/** Lo que la proyección necesita saber de la variable, sea cual sea. */
export interface DefinicionVariableMeta {
  etiqueta: string;
  unidad: string;
  /** Rango admisible: fuera de él, un valor proyectado se descarta. */
  min: number;
  max: number;
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
    fechaObjetivo: Date | null;
    /** Cuándo se planteó la meta: define el punto de partida. */
    creadoEn?: Date | null;
  } & MetaNumerica,
  serie: readonly PuntoSerie[],
  ahora: Date = new Date(),
): ProyeccionObjetivo {
  return proyectarMeta(
    objetivo,
    definicionVariable(objetivo.variable),
    serie,
    ahora,
  );
}

/**
 * La proyección sin atarse a un juego de variables: recibe la definición de
 * la variable (etiqueta, unidad y rango) en vez de buscarla. Es lo que deja
 * que la bioimpedancia proyecte sus metas con la MISMA regla que la
 * antropometría —punto de partida, ritmo, estados— sin copiarla.
 */
export function proyectarMeta<V extends string>(
  objetivo: {
    variable: V;
    fechaObjetivo: Date | null;
    /** Cuándo se planteó la meta: define el punto de partida. */
    creadoEn?: Date | null;
  } & MetaNumerica,
  definicion: DefinicionVariableMeta,
  serie: readonly PuntoSerie[],
  ahora: Date = new Date(),
): ProyeccionMeta<V> {
  const { etiqueta, unidad, min, max } = definicion;
  const base: ProyeccionMeta<V> = {
    variable: objetivo.variable,
    etiqueta,
    unidad,
    valorObjetivo: objetivo.rango == null ? objetivo.valorObjetivo : null,
    rango: objetivo.rango ?? null,
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
    retroceso: null,
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

  // Con un rango, la brecha se mide hasta el borde más cercano: para entrar
  // alcanza con cruzarlo. El resto de la proyección (ritmo necesario, fecha
  // de llegada, estado) sale de esa brecha igual que con un valor.
  const brecha = valorBuscado(objetivo, ultimo.valor) - ultimo.valor;
  const { progreso, alcanzado } =
    objetivo.rango != null
      ? avanceHaciaRango(objetivo.rango, primero.valor, ultimo.valor)
      : avanceHaciaValor(objetivo.valorObjetivo, primero.valor, ultimo.valor);

  // La tendencia es una recta sobre toda la serie y tarda en darse vuelta:
  // tres consultas bajando y una subiendo siguen dando una pendiente hacia la
  // meta, y el paciente figuraba «en camino» después de alejarse. Que la
  // última haya quedado peor que la partida o que la anterior se mira aparte,
  // y le gana a la tendencia.
  const anterior = todos.length >= 2 ? todos[todos.length - 2]! : null;
  const retroceso = alcanzado
    ? null
    : retrocesoDe(
        objetivo,
        brecha,
        ultimo.valor,
        primero.valor,
        anterior?.valor,
      );

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
    retroceso,
    estado: clasificar({
      alcanzado,
      retroceso,
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
 * Avance hacia un VALOR: qué fracción del camino planteado ya se hizo, y si
 * se llegó. Si el objetivo coincidía con el valor de partida no hay camino, y
 * el progreso es 100.
 */
function avanceHaciaValor(
  valorObjetivo: number,
  inicial: number,
  actual: number,
): { progreso: number; alcanzado: boolean } {
  const brecha = valorObjetivo - actual;
  const recorridoTotal = valorObjetivo - inicial;
  const progreso =
    Math.abs(recorridoTotal) < 1e-9
      ? 100
      : limitar(((actual - inicial) / recorridoTotal) * 100, 0, 100);
  const alcanzado =
    Math.abs(brecha) <= Math.abs(valorObjetivo) * TOLERANCIA_RELATIVA ||
    // También cuenta como alcanzado haberse pasado de largo en la dirección
    // buscada: bajar a 11 kg cuando la meta era 12 kg es cumplir.
    (recorridoTotal !== 0 && Math.sign(brecha) !== Math.sign(recorridoTotal));
  return { progreso, alcanzado };
}

/**
 * Avance hacia un RANGO: se llega estando ADENTRO, y pasarse del otro borde
 * no cuenta. El progreso es cuánto se acortó la distancia al rango desde la
 * partida, y no la fracción de un camino entre dos puntos: un paciente que
 * arrancó 5 kg debajo y hoy está 2 kg arriba no hizo el 100 %, quedó a 2 kg.
 * Si arrancó adentro y salió, el progreso es 0: no hay camino que acreditar.
 */
function avanceHaciaRango(
  rango: RangoMeta,
  inicial: number,
  actual: number,
): { progreso: number; alcanzado: boolean } {
  if (dentroDelRango(rango, actual)) return { progreso: 100, alcanzado: true };
  const distanciaInicial = distanciaAlRango(rango, inicial);
  const distanciaActual = distanciaAlRango(rango, actual);
  const progreso =
    distanciaInicial < 1e-9
      ? 0
      : limitar((1 - distanciaActual / distanciaInicial) * 100, 0, 100);
  return { progreso, alcanzado: false };
}

/**
 * ¿La última medición quedó más lejos de la meta que la de partida o que la
 * anterior? Se compara cuánto le falta a cada una para cumplir:
 *
 * - Con un VALOR, en la dirección que hoy hay que recorrer (el signo de la
 *   brecha). Así una anterior que ya se había pasado de largo, y por eso
 *   cumplía, cuenta como más cerca que la actual que volvió a no cumplir.
 * - Con un RANGO, la distancia al rango, que es lo que mide su progreso:
 *   cruzarlo entero de 12 a 18 con un rango de 15 a 17 es quedar más cerca
 *   (a 1 y no a 3), no alejarse.
 *
 * Cualquier diferencia cuenta: no hay tolerancia, porque una medición que
 * empeora y sigue diciendo «en camino» es justo lo que esto viene a evitar.
 */
function retrocesoDe(
  meta: MetaNumerica,
  brecha: number,
  actual: number,
  partida: number,
  anterior: number | undefined,
): RetrocesoMeta | null {
  const loQueFalta = (valor: number): number =>
    meta.rango != null
      ? distanciaAlRango(meta.rango, valor)
      : (meta.valorObjetivo - valor) * Math.sign(brecha);
  const faltaHoy = loQueFalta(actual);
  const quedoPeorQue = (valor: number): boolean =>
    faltaHoy - loQueFalta(valor) > 1e-9;

  if (quedoPeorQue(partida)) return "DESDE_EL_INICIO";
  if (anterior != null && quedoPeorQue(anterior)) return "DESDE_LA_ANTERIOR";
  return null;
}

/** Cuánto le falta a un valor para entrar al rango (0 si ya está adentro). */
function distanciaAlRango(rango: RangoMeta, valor: number): number {
  if (valor < rango.minimo) return rango.minimo - valor;
  if (valor > rango.maximo) return valor - rango.maximo;
  return 0;
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
  retroceso: RetrocesoMeta | null;
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
  // brecha no se cierra nunca, y el dashboard tiene que decirlo. Y aunque la
  // tendencia vaya bien, una última medición peor que la partida o que la
  // anterior es alejarse.
  const avanza =
    Math.abs(datos.ritmoSemanal) > 1e-9 &&
    Math.sign(datos.ritmoSemanal) === Math.sign(datos.brecha);
  if (!avanza || datos.retroceso != null) return "ALEJANDOSE";

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
    case "MASA_OSEA_KG":
      return f?.osea.kg ?? null;
    case "MASA_OSEA_PORCENTAJE":
      return f?.osea.porcentaje ?? null;
    case "MASA_RESIDUAL_KG":
      return f?.residual.kg ?? null;
    case "MASA_RESIDUAL_PORCENTAJE":
      return f?.residual.porcentaje ?? null;
    case "MASA_PIEL_KG":
      return f?.piel.kg ?? null;
    case "MASA_PIEL_PORCENTAJE":
      return f?.piel.porcentaje ?? null;
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
