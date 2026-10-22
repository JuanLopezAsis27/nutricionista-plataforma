import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Medidas de un alimento (migración 90): no todo se mide en gramos.
 *
 * Es el modelo de FatSecret, en dos piezas:
 *
 * 1. La UNIDAD BASE del alimento: sus macros son «por 100 g» (un sólido) o
 *    «por 100 ml» (un líquido). Es lo único que sabe la cuenta de macros.
 * 2. Sus MEDIDAS: «1 taza = 240», «1 unidad = 50», expresadas en esa unidad
 *    base. Hay medidas ESTÁNDAR que valen para cualquier alimento de esa
 *    unidad (1 litro = 1000 ml, 1 cucharada = 15 ml) y medidas PROPIAS del
 *    alimento, que son las que no se pueden deducir (cuánto pesa un huevo,
 *    cuántos gramos de azúcar entran en una cucharada).
 *
 * Una cucharada de un sólido no es 15 g: depende de qué haya adentro. Por eso
 * las medidas de volumen son estándar solo para la unidad MILILITRO; para un
 * alimento en gramos, «cucharada» existe solo si el alimento la declara.
 *
 * Donde se USA el alimento (un plan, una receta) la cantidad se escribe en
 * cualquiera de sus medidas, pero lo que se guarda para sumar es siempre la
 * cantidad en la unidad base (`cantidadGramos`, que para un líquido son ml).
 * Ver docs/MEDIDAS-ALIMENTOS.md.
 */

export const UNIDADES_BASE_ALIMENTO = ["GRAMO", "MILILITRO"] as const;
export type UnidadBaseAlimento = (typeof UNIDADES_BASE_ALIMENTO)[number];

/** Cómo se escribe cada unidad base al lado de un número. */
export const SIMBOLO_UNIDAD_BASE: Record<UnidadBaseAlimento, string> = {
  GRAMO: "g",
  MILILITRO: "ml",
};

/** «1 <nombre> = <cantidad> g/ml» (la unidad la pone el alimento). */
export interface MedidaAlimento {
  nombre: string;
  cantidad: number;
}

/**
 * Medidas que tiene cualquier alimento de esa unidad base, sin declararlas.
 * Solo equivalencias exactas o de uso clínico corriente; un alimento las
 * pisa declarando una medida propia con el mismo nombre (su «vaso» de 250).
 */
export const MEDIDAS_ESTANDAR: Record<
  UnidadBaseAlimento,
  readonly MedidaAlimento[]
> = {
  GRAMO: [{ nombre: "kg", cantidad: 1000 }],
  MILILITRO: [
    { nombre: "litro", cantidad: 1000 },
    { nombre: "cm³", cantidad: 1 },
    { nombre: "cucharada", cantidad: 15 },
    { nombre: "cucharadita", cantidad: 5 },
    { nombre: "taza", cantidad: 250 },
    { nombre: "vaso", cantidad: 200 },
  ],
};

/** Tope de medidas propias de un alimento. */
export const MAXIMO_MEDIDAS_ALIMENTO = 20;
/** Largo máximo del nombre de una medida («unidad mediana», «rodaja»). */
export const LARGO_MAXIMO_NOMBRE_MEDIDA = 40;

/**
 * Valida y limpia las medidas propias de un alimento: nombre recortado y no
 * vacío, cantidad mayor que cero, una sola por nombre (sin mayúsculas ni
 * tildes; si se repite, queda la última). Lanza ante un dato inválido.
 */
export function normalizarMedidas(
  medidas:
    ReadonlyArray<{ nombre: string; cantidad: number }> | null | undefined,
  alimento: string,
): MedidaAlimento[] {
  const porNombre = new Map<string, MedidaAlimento>();
  for (const medida of medidas ?? []) {
    const nombre = (medida.nombre ?? "").trim().replace(/\s+/g, " ");
    if (nombre === "") {
      throw new ErrorValidacion(
        `Cada medida de «${alimento}» tiene que tener un nombre.`,
      );
    }
    if (nombre.length > LARGO_MAXIMO_NOMBRE_MEDIDA) {
      throw new ErrorValidacion(
        `El nombre de la medida «${nombre}» es demasiado largo.`,
      );
    }
    if (!Number.isFinite(medida.cantidad) || medida.cantidad <= 0) {
      throw new ErrorValidacion(
        `La medida «${nombre}» de «${alimento}» tiene que equivaler a más de cero.`,
      );
    }
    const clave = claveMedida(nombre);
    porNombre.delete(clave); // la repetida va al lugar de la última
    porNombre.set(clave, { nombre, cantidad: redondear1(medida.cantidad) });
  }
  const resultado = [...porNombre.values()];
  if (resultado.length > MAXIMO_MEDIDAS_ALIMENTO) {
    throw new ErrorValidacion(
      `«${alimento}» puede tener hasta ${MAXIMO_MEDIDAS_ALIMENTO} medidas.`,
    );
  }
  return resultado;
}

/**
 * Las medidas en las que se puede indicar un alimento: las propias primero y
 * después las estándar de su unidad que no estén pisadas por una propia.
 */
export function medidasDisponibles(
  unidadBase: UnidadBaseAlimento,
  propias: ReadonlyArray<MedidaAlimento>,
): MedidaAlimento[] {
  const nombres = new Set(propias.map((m) => claveMedida(m.nombre)));
  return [
    ...propias,
    ...MEDIDAS_ESTANDAR[unidadBase].filter(
      (m) => !nombres.has(claveMedida(m.nombre)),
    ),
  ];
}

/**
 * La unidad base que nombra un texto (la columna «Unidad» de una planilla), o
 * null si no nombra ninguna. Acepta g, gr, gramos, ml, cc, cm3, mililitros…
 */
export function unidadBaseDesdeTexto(
  texto: string | null | undefined,
): UnidadBaseAlimento | null {
  const t = sinTildes(texto ?? "")
    .replace(/[^a-z0-9³]/g, "")
    .replace(/^100/, ""); // «100 g», «100ml»
  if (t === "") return null;
  if (["g", "gr", "grs", "gramo", "gramos"].includes(t)) return "GRAMO";
  if (
    ["ml", "mililitro", "mililitros", "cc", "cm3", "cm³", "cmc"].includes(t)
  ) {
    return "MILILITRO";
  }
  return null;
}

/**
 * Las medidas que describe un texto libre (la columna «Medidas» de una
 * planilla). Separadas por `;`, `|` o salto de línea, cada una como:
 *
 *   «taza = 240» · «1 taza = 240» · «1 taza (240 ml)» · «taza: 240 g»
 *   · «2 tazas = 480» (se divide: 1 taza = 240)
 *
 * El número es siempre en la unidad base del alimento; la unidad escrita al
 * lado se ignora. Lo que no se entiende se descarta sin romper la
 * importación, como una categoría desconocida.
 */
export function medidasDesdeTexto(
  texto: string | null | undefined,
): MedidaAlimento[] {
  const medidas: MedidaAlimento[] = [];
  for (const parte of (texto ?? "").split(/[;|\n]/)) {
    const encontrado = PATRON_MEDIDA.exec(parte.trim());
    if (!encontrado) continue;
    const veces = encontrado[1] ? numeroDeTexto(encontrado[1]) : 1;
    const nombre = singular(encontrado[2]!.trim(), veces ?? 1);
    const total = numeroDeTexto(encontrado[3]!);
    if (!veces || veces <= 0 || !total || total <= 0 || nombre === "") continue;
    if (nombre.length > LARGO_MAXIMO_NOMBRE_MEDIDA) continue;
    medidas.push({ nombre, cantidad: redondear1(total / veces) });
  }
  return medidas.slice(0, MAXIMO_MEDIDAS_ALIMENTO);
}

/** Las medidas como texto, en el formato que entiende `medidasDesdeTexto`. */
export function medidasATexto(
  medidas: ReadonlyArray<MedidaAlimento>,
  unidadBase: UnidadBaseAlimento,
): string {
  return medidas
    .map(
      (m) => `1 ${m.nombre} = ${m.cantidad} ${SIMBOLO_UNIDAD_BASE[unidadBase]}`,
    )
    .join("; ");
}

// --- La cantidad donde se usa un alimento ------------------------------------

/**
 * Cómo se indicó la cantidad de un alimento en un plan o una receta, ya
 * normalizada. `cantidadGramos` es SIEMPRE la cantidad en la unidad base (g o
 * ml) y la única que suma macros; el resto dice cómo se la escribió.
 */
export interface CantidadDeAlimento {
  /** Cantidad en la unidad base: gramos, o mililitros si es un líquido. */
  cantidadGramos: number | null;
  unidadBase: UnidadBaseAlimento;
  /** Copia de las medidas propias del alimento al elegirlo. */
  medidas: MedidaAlimento[];
  /** Nombre de la medida elegida, o null si se escribió en g/ml. */
  medida: string | null;
  /** Cuántas de esa medida («2» cucharadas). */
  cantidadMedida: number | null;
  /** Cuánto es una de esa medida en la unidad base, copiado al elegirla. */
  cantidadPorMedida: number | null;
}

/** Lo que llega de un formulario o de una copia; todo opcional. */
export interface DatosCantidadDeAlimento {
  cantidadGramos?: number | null;
  unidadBase?: UnidadBaseAlimento | null;
  medidas?: ReadonlyArray<MedidaAlimento> | null;
  medida?: string | null;
  cantidadMedida?: number | null;
  cantidadPorMedida?: number | null;
}

/**
 * Valida la cantidad de un alimento usado y resuelve la cantidad en la unidad
 * base. Con una medida elegida, la base SALE de la medida (cantidad ×
 * equivalencia) y lo que haya mandado el formulario en `cantidadGramos` se
 * descarta: así las dos nunca pueden decir cosas distintas.
 */
export function normalizarCantidadDeAlimento(
  datos: DatosCantidadDeAlimento,
  alimento: string,
): CantidadDeAlimento {
  const unidadBase = datos.unidadBase ?? "GRAMO";
  const medidas = normalizarMedidas(datos.medidas, alimento);
  const medida = (datos.medida ?? "").trim().replace(/\s+/g, " ");

  if (medida === "") {
    return {
      cantidadGramos: noNegativo(datos.cantidadGramos, alimento),
      unidadBase,
      medidas,
      medida: null,
      cantidadMedida: null,
      cantidadPorMedida: null,
    };
  }

  const porMedida = datos.cantidadPorMedida;
  if (porMedida == null || !Number.isFinite(porMedida) || porMedida <= 0) {
    throw new ErrorValidacion(
      `Falta cuánto es «${medida}» de «${alimento}» en ${SIMBOLO_UNIDAD_BASE[unidadBase]}.`,
    );
  }
  const cantidadMedida = noNegativo(datos.cantidadMedida, alimento);
  return {
    cantidadGramos:
      cantidadMedida != null ? redondear1(cantidadMedida * porMedida) : null,
    unidadBase,
    medidas,
    medida,
    cantidadMedida: cantidadMedida != null ? redondear2(cantidadMedida) : null,
    cantidadPorMedida: redondear1(porMedida),
  };
}

/**
 * La cantidad para leer: «2 cucharadas (30 ml)», «150 g», o null si no hay
 * cantidad. Es lo que muestran el plan, la receta, el PDF y el asistente.
 */
export function describirCantidad(cantidad: {
  cantidadGramos: number | null;
  unidadBase?: UnidadBaseAlimento | null;
  medida?: string | null;
  cantidadMedida?: number | null;
}): string | null {
  const simbolo = SIMBOLO_UNIDAD_BASE[cantidad.unidadBase ?? "GRAMO"];
  if (cantidad.medida && cantidad.cantidadMedida != null) {
    const enMedida = `${formatear(cantidad.cantidadMedida)} ${pluralizar(
      cantidad.medida,
      cantidad.cantidadMedida,
    )}`;
    return cantidad.cantidadGramos != null
      ? `${enMedida} (${formatear(cantidad.cantidadGramos)} ${simbolo})`
      : enMedida;
  }
  if (cantidad.cantidadGramos == null) return null;
  return `${formatear(cantidad.cantidadGramos)} ${simbolo}`;
}

// --- Ayudas -----------------------------------------------------------------

/**
 * «1 taza = 240» con variantes. Grupos: veces (opcional), nombre, total.
 * El separador puede ser =, : o un paréntesis.
 */
const PATRON_MEDIDA =
  /^(\d+(?:[.,]\d+)?\s+)?([^=:(]+?)\s*(?:=|:|\()\s*(\d+(?:[.,]\d+)?)\s*[a-zA-Z³]*\s*\)?$/;

/** Nombres que no se pluralizan: abreviaturas y símbolos. */
const SIN_PLURAL = new Set(["kg", "g", "ml", "cc", "cm³", "cm3", "l", "oz"]);

function claveMedida(nombre: string): string {
  return singular(sinTildes(nombre).replace(/\s+/g, " ").trim(), 1);
}

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * «2 tazas» con la primera palabra en plural. Solo si lo que sigue no la
 * calificaría («taza (grande)», «cucharada de postre»): «2 tazas grande» se
 * lee peor que «2 taza grande».
 */
function pluralizar(nombre: string, cantidad: number): string {
  if (cantidad <= 1) return nombre;
  const [primera = "", ...resto] = nombre.split(" ");
  const sigue = resto.join(" ");
  if (sigue !== "" && !/^(\(|de )/.test(sigue)) return nombre;
  if (SIN_PLURAL.has(primera.toLowerCase())) return nombre;
  if (!/^[a-záéíóúñü]{3,}$/i.test(primera)) return nombre;
  let plural: string;
  if (/s$/i.test(primera)) plural = primera;
  else if (/[aeiouáéó]$/i.test(primera)) plural = `${primera}s`;
  else if (/z$/i.test(primera)) plural = `${primera.slice(0, -1)}ces`;
  else if (/ón$/i.test(primera)) plural = `${primera.slice(0, -2)}ones`;
  else plural = `${primera}es`;
  return sigue === "" ? plural : `${plural} ${sigue}`;
}

/**
 * El singular de la primera palabra cuando se escribió en plural («2 tazas
 * = 480» → «taza»). Conservador: solo deshace los plurales en -s de vocal y
 * en -es de «unidades», «porciones».
 */
function singular(nombre: string, veces: number): string {
  const [primera = "", ...resto] = nombre.split(" ");
  let s = primera;
  if (veces !== 1 || /s$/i.test(primera)) {
    if (/ciones$/i.test(primera)) s = `${primera.slice(0, -5)}ción`;
    else if (/(d|l|r|n)es$/i.test(primera)) s = primera.slice(0, -2);
    else if (/[aeo]s$/i.test(primera) && primera.length > 3)
      s = primera.slice(0, -1);
  }
  return [s, ...resto].join(" ");
}

function numeroDeTexto(texto: string): number | null {
  const n = Number(texto.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function noNegativo(
  valor: number | null | undefined,
  alimento: string,
): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErrorValidacion(
      `La cantidad de «${alimento}» no puede ser negativa.`,
    );
  }
  return valor;
}

/** Hasta dos decimales, con coma: «1,5», «0,25», «240». */
function formatear(valor: number): string {
  return (Math.round(valor * 100) / 100).toString().replace(".", ",");
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}
