import {
  definicionVariable,
  type VariableComposicion,
} from "../entidades/ObjetivoComposicion";
import type { MetodoGrasa } from "./grasaPorPliegues";
import type {
  MedidasComposicion,
  ResultadoComposicion,
} from "./composicionCorporal";

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
 * Tolerancia relativa para dar una meta por alcanzada. Sin ella, un objetivo
 * de 12,0 kg con una medición de 11,999 kg quedaría eternamente "en curso".
 */
const TOLERANCIA_RELATIVA = 0.005;

/**
 * Proyecta un objetivo sobre la serie histórica de su variable.
 * `serie` debe venir ordenada por fecha ascendente y sin huecos (los valores
 * null se filtran antes: una medición sin esa variable no participa).
 */
export function proyectarObjetivo(
  objetivo: {
    variable: VariableComposicion;
    valorObjetivo: number;
    fechaObjetivo: Date | null;
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
    ritmoSemanalNecesario: null,
    fechaProyectada: null,
    valorProyectadoAFecha: null,
    estado: "SIN_DATOS",
  };

  const puntos = [...serie].sort(
    (a, b) => a.fecha.getTime() - b.fecha.getTime(),
  );
  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  if (!primero || !ultimo) return base;

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
