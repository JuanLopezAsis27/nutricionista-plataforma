import {
  sumarMacros,
  sumarTodos,
  MACROS_VACIOS,
  type Macros,
} from "./macrosAlimentos";
import {
  compararConMetas,
  TOLERANCIA_META,
  type ComparacionDia,
  type MetasDiarias,
  type TipoMeta,
} from "./comparacionMacros";

/**
 * Las combinaciones de un plan que mejor cumplen las metas diarias.
 *
 * Un plan nutricional tiene franjas (Desayuno, Almuerzo…) y cada franja varias
 * OPCIONES intercambiables. Un día concreto es elegir UNA opción por franja, y
 * cada elección suma distinto: el plan cumple las metas si el paciente come la
 * opción 1 del almuerzo, y no si come la 3. Mostrar "el total del plan" no
 * tiene sentido —sumar las opciones sería comer tres almuerzos— y mostrar
 * todas las combinaciones tampoco —4 franjas × 3 opciones son 81 días—. Lo
 * que sirve es ver las pocas que mejor se ajustan, y con eso saber si la
 * mejor alcanza y cuánto se aleja la tercera.
 *
 * ## Cómo se ordena
 *
 * Cada combinación lleva un PUNTAJE (menor es mejor) que suma, por cada macro
 * con meta, cuánto se aparta de ella en términos relativos:
 *
 *  - lo que la INCUMPLE pesa ×10: salirse de la meta es mucho peor que estar
 *    dentro con algo de margen, y un día que cumple todo tiene que ganarle
 *    siempre a uno que clava tres macros y falla la cuarta por mucho;
 *  - dentro de lo que cumple, un APROXIMADO prefiere el centro (pesa el
 *    desvío entero) y un MÍNIMO o un MÁXIMO desempatan apenas hacia su límite
 *    (×0,1): 150 g de proteína "como mínimo 120" cumple, pero entre dos que
 *    cumplen es preferible la que no se pasa tanto.
 *
 * Una macro con meta y sin dato cuenta como incumplida (un día sin el dato no
 * puede ganarle a uno que lo tiene y cumple). Una macro sin meta no pesa.
 *
 * ## Cuántas se evalúan
 *
 * Hasta `LIMITE_EXHAUSTIVO` combinaciones se recorren todas y el resultado es
 * exacto. Más allá (un plan con muchas franjas y muchas opciones) se usa una
 * búsqueda por haz: se avanza franja por franja quedándose con las mejores
 * `ANCHO_HAZ` parciales, estimando lo que falta con el promedio de las
 * opciones de las franjas que quedan. Es una aproximación, y el resultado lo
 * dice (`exhaustivo: false`).
 */

export const LIMITE_EXHAUSTIVO = 50_000;
export const ANCHO_HAZ = 2_000;

/** Peso de lo que incumple frente a lo que solo se aparta. */
const PESO_INCUMPLIMIENTO = 10;
/** Desempate de un piso o techo cumplido hacia su límite. */
const PESO_HOLGURA = 0.1;
/** Una meta con dato faltante cuenta como este desvío. */
const PENALIDAD_SIN_DATO = 1;

/** Una opción de una franja, con lo que suma. */
export interface OpcionEvaluable {
  numero: number;
  macros: Macros;
}

/** Una franja del día con sus opciones intercambiables. */
export interface FranjaEvaluable {
  nombre: string;
  opciones: OpcionEvaluable[];
}

/** Qué opción se eligió en cada franja. */
export interface Eleccion {
  franja: string;
  opcion: number;
}

export interface Combinacion {
  elecciones: Eleccion[];
  macros: Macros;
  comparacion: ComparacionDia;
  /** Cuántas de las metas cargadas cumple. */
  metasCumplidas: number;
  /** Menor es mejor. Ver el encabezado del módulo. */
  puntaje: number;
}

export interface ResultadoCombinaciones {
  /** Cuántos días distintos se pueden armar con el plan. */
  total: number;
  /** Cuántas metas tiene cargadas el plan (0 = no hay contra qué comparar). */
  metasCargadas: number;
  /** false si el plan era demasiado grande y se buscó por aproximación. */
  exhaustivo: boolean;
  /** Las mejores, la primera es la mejor. Vacío si no hay metas. */
  mejores: Combinacion[];
}

const CLAVES: (keyof Macros)[] = [
  "calorias",
  "proteinasG",
  "carbohidratosG",
  "grasasG",
];

export function mejoresCombinaciones(
  franjas: FranjaEvaluable[],
  metas: MetasDiarias | null,
  cantidad = 3,
): ResultadoCombinaciones {
  // Una franja sin opciones no aporta nada ni multiplica: se ignora.
  const conOpciones = franjas.filter((f) => f.opciones.length > 0);
  const total =
    conOpciones.length === 0
      ? 0
      : conOpciones.reduce((producto, f) => producto * f.opciones.length, 1);
  const metasCargadas = contarMetas(metas);

  if (total === 0 || metasCargadas === 0 || metas === null) {
    return { total, metasCargadas, exhaustivo: true, mejores: [] };
  }

  const exhaustivo = total <= LIMITE_EXHAUSTIVO;
  const indices = exhaustivo
    ? recorrerTodas(conOpciones, metas, cantidad)
    : buscarPorHaz(conOpciones, metas, cantidad);

  const mejores = indices.map((eleccion) =>
    armarCombinacion(conOpciones, eleccion, metas),
  );
  return { total, metasCargadas, exhaustivo, mejores };
}

/** Puntaje de un total del día frente a las metas. Menor es mejor. */
export function puntuar(macros: Macros, metas: MetasDiarias): number {
  let puntaje = 0;
  for (const clave of CLAVES) {
    const meta = metas[clave];
    if (meta == null || meta <= 0) continue;
    const valor = macros[clave];
    if (valor == null) {
      puntaje += PENALIDAD_SIN_DATO * PESO_INCUMPLIMIENTO;
      continue;
    }
    puntaje += desvio(valor, meta, metas.tipos?.[clave] ?? "APROXIMADO");
  }
  return puntaje;
}

function desvio(valor: number, meta: number, tipo: TipoMeta): number {
  const relativo = (valor - meta) / meta;
  if (tipo === "MINIMO") {
    const falta = Math.max(0, -relativo);
    return falta * PESO_INCUMPLIMIENTO + Math.max(0, relativo) * PESO_HOLGURA;
  }
  if (tipo === "MAXIMO") {
    const sobra = Math.max(0, relativo);
    return sobra * PESO_INCUMPLIMIENTO + Math.max(0, -relativo) * PESO_HOLGURA;
  }
  const absoluto = Math.abs(relativo);
  const fuera = Math.max(0, absoluto - TOLERANCIA_META);
  return fuera * PESO_INCUMPLIMIENTO + absoluto;
}

function contarMetas(metas: MetasDiarias | null): number {
  if (!metas) return 0;
  return CLAVES.filter((clave) => metas[clave] != null && metas[clave] > 0)
    .length;
}

/** Índice de opción elegido en cada franja. */
type Indices = number[];

interface Candidata {
  indices: Indices;
  puntaje: number;
}

/**
 * Recorre todas las combinaciones como un odómetro y se queda con las
 * `cantidad` de menor puntaje. No arma arrays por combinación: con 50.000 el
 * costo de la basura se nota.
 */
function recorrerTodas(
  franjas: FranjaEvaluable[],
  metas: MetasDiarias,
  cantidad: number,
): Indices[] {
  const indices = franjas.map(() => 0);
  const mejores: Candidata[] = [];

  for (;;) {
    const macros = sumarTodos(
      franjas.map((f, i) => opcionEn(f, indices[i]).macros),
    );
    insertarSiEntra(
      mejores,
      { indices: [...indices], puntaje: puntuar(macros, metas) },
      cantidad,
    );

    // Avanza el odómetro; cuando la primera franja da la vuelta, terminó.
    let franja = franjas.length - 1;
    while (franja >= 0) {
      const siguiente = (indices[franja] ?? 0) + 1;
      if (siguiente < (franjas[franja]?.opciones.length ?? 0)) {
        indices[franja] = siguiente;
        break;
      }
      indices[franja] = 0;
      franja--;
    }
    if (franja < 0) break;
  }
  return mejores.map((c) => c.indices);
}

/**
 * Búsqueda por haz para planes demasiado grandes para recorrer enteros.
 *
 * Lo que falta por elegir se estima con el PROMEDIO de las opciones de cada
 * franja restante: sin esa estimación, todas las parciales estarían "por
 * debajo" de la meta y el haz preferiría siempre las más pesadas.
 */
function buscarPorHaz(
  franjas: FranjaEvaluable[],
  metas: MetasDiarias,
  cantidad: number,
): Indices[] {
  const promedios = franjas.map((f) =>
    promedio(f.opciones.map((o) => o.macros)),
  );
  // Estimación de lo que aportan las franjas desde `i` en adelante.
  const restante: Macros[] = franjas.map((_, i) =>
    sumarTodos(promedios.slice(i + 1)),
  );

  let haz: { indices: Indices; macros: Macros }[] = [
    { indices: [], macros: MACROS_VACIOS },
  ];
  franjas.forEach((franja, i) => {
    const siguientes: (Candidata & { macros: Macros })[] = [];
    for (const parcial of haz) {
      franja.opciones.forEach((opcion, indice) => {
        const macros = sumarMacros(parcial.macros, opcion.macros);
        siguientes.push({
          indices: [...parcial.indices, indice],
          macros,
          puntaje: puntuar(
            sumarMacros(macros, restante[i] ?? MACROS_VACIOS),
            metas,
          ),
        });
      });
    }
    siguientes.sort((a, b) => a.puntaje - b.puntaje);
    haz = siguientes.slice(0, ANCHO_HAZ);
  });

  return haz
    .map((c) => ({ indices: c.indices, puntaje: puntuar(c.macros, metas) }))
    .sort((a, b) => a.puntaje - b.puntaje)
    .slice(0, cantidad)
    .map((c) => c.indices);
}

function insertarSiEntra(
  mejores: Candidata[],
  candidata: Candidata,
  cantidad: number,
): void {
  if (
    mejores.length >= cantidad &&
    candidata.puntaje >= (mejores.at(-1)?.puntaje ?? Infinity)
  ) {
    return;
  }
  // Desempate estable: a igual puntaje queda la que apareció antes, que es la
  // de opciones de número más bajo —la que el profesional puso primero—.
  let posicion = mejores.findIndex((c) => candidata.puntaje < c.puntaje);
  if (posicion === -1) posicion = mejores.length;
  mejores.splice(posicion, 0, candidata);
  if (mejores.length > cantidad) mejores.pop();
}

function armarCombinacion(
  franjas: FranjaEvaluable[],
  indices: Indices,
  metas: MetasDiarias,
): Combinacion {
  const elegidas = franjas.map((f, i) => opcionEn(f, indices[i]));
  const macros = sumarTodos(elegidas.map((o) => o.macros));
  const comparacion = compararConMetas(macros, metas);
  const metasCumplidas = CLAVES.filter(
    (clave) => comparacion[clave].estado === "EN_RANGO",
  ).length;
  return {
    elecciones: franjas.map((f, i) => ({
      franja: f.nombre,
      opcion: opcionEn(f, indices[i]).numero,
    })),
    macros,
    comparacion,
    metasCumplidas,
    puntaje: Math.round(puntuar(macros, metas) * 1000) / 1000,
  };
}

function promedio(lista: Macros[]): Macros {
  const n = lista.length;
  if (n === 0) return MACROS_VACIOS;
  const suma = sumarTodos(lista);
  const dividir = (v: number | null): number | null =>
    v == null ? null : v / n;
  return {
    calorias: dividir(suma.calorias),
    proteinasG: dividir(suma.proteinasG),
    carbohidratosG: dividir(suma.carbohidratosG),
    grasasG: dividir(suma.grasasG),
  };
}

/** La opción en esa posición. Los índices salen de recorrer la misma lista. */
function opcionEn(
  franja: FranjaEvaluable,
  indice: number | undefined,
): OpcionEvaluable {
  const opcion = franja.opciones[indice ?? 0];
  if (!opcion) {
    throw new Error(`Índice de opción fuera de rango en «${franja.nombre}».`);
  }
  return opcion;
}
