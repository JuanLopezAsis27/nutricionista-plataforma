import { z } from "zod";
import {
  MEDIDAS_ESTANDAR,
  SIMBOLO_UNIDAD_BASE,
  UNIDADES_BASE_ALIMENTO,
  type MedidaAlimento,
  type UnidadBaseAlimento,
} from "@/dominio/entidades/medidasAlimento";

/**
 * La cantidad de un alimento tal como la tiene un FORMULARIO (migración 90):
 * en g/ml o en una de sus medidas («2 cucharadas»).
 *
 * Lo comparten los cuatro editores que cargan alimentos —receta, opción del
 * plan, comida del plan semanal y receta de la plataforma—, igual que el
 * espejo de macros (`macros.ts`): con cuatro copias, el primer arreglo se
 * aplicaría en una sola.
 *
 * Es un ESPEJO de la regla del dominio (`dominio/entidades/medidasAlimento`):
 * la pantalla necesita la cantidad en g/ml para los totales en vivo, y la
 * presentación no puede importar funciones del dominio (solo sus constantes,
 * como `MEDIDAS_ESTANDAR`). Al guardar manda el dominio: recalcula los g/ml
 * de la medida y descarta lo que haya mandado la pantalla.
 *
 * Los números van como texto, como el resto del formulario.
 */
export interface CantidadEnFormulario {
  /** En g/ml. Es lo que se tipea cuando no hay medida elegida. */
  cantidadGramos: string;
  unidadBase: UnidadBaseAlimento;
  /** Copia de las medidas propias del alimento. */
  medidas: MedidaAlimento[];
  /** Medida elegida; vacío = en g/ml. */
  medida: string;
  /** Cuántas de la medida; es lo que se tipea cuando hay una elegida. */
  cantidadMedida: string;
  /** Cuánto es una de la medida en g/ml. */
  cantidadPorMedida: string;
}

/** Los campos del esquema zod de cada formulario (se mezclan con `...`). */
export const camposCantidadEsquema = {
  cantidadGramos: z.string(),
  unidadBase: z.enum(UNIDADES_BASE_ALIMENTO),
  medidas: z.array(z.object({ nombre: z.string(), cantidad: z.number() })),
  medida: z.string(),
  cantidadMedida: z.string(),
  cantidadPorMedida: z.string(),
};

/** Un alimento cargado a mano: en gramos, sin medidas. */
export const CANTIDAD_VACIA: CantidadEnFormulario = {
  cantidadGramos: "",
  unidadBase: "GRAMO",
  medidas: [],
  medida: "",
  cantidadMedida: "",
  cantidadPorMedida: "",
};

/**
 * La cantidad con la que entra un alimento elegido en el buscador. Como en
 * FatSecret, si el alimento tiene medidas propias arranca en «1» de la
 * primera (1 unidad, 1 taza); si no, en 100 g/ml.
 */
export function cantidadDesdeAlimento(alimento: {
  unidadBase: UnidadBaseAlimento;
  medidas: MedidaAlimento[];
}): CantidadEnFormulario {
  const primera = alimento.medidas[0];
  if (primera) {
    return {
      cantidadGramos: texto(primera.cantidad),
      unidadBase: alimento.unidadBase,
      medidas: alimento.medidas,
      medida: primera.nombre,
      cantidadMedida: "1",
      cantidadPorMedida: texto(primera.cantidad),
    };
  }
  return {
    ...CANTIDAD_VACIA,
    cantidadGramos: "100",
    unidadBase: alimento.unidadBase,
    medidas: alimento.medidas,
  };
}

/** Lo guardado (la salida del servidor) → el formulario. */
export function cantidadDesdeGuardado(guardado: {
  cantidadGramos: number | null;
  unidadBase: UnidadBaseAlimento;
  medidas: MedidaAlimento[];
  medida: string | null;
  cantidadMedida: number | null;
  cantidadPorMedida: number | null;
}): CantidadEnFormulario {
  return {
    cantidadGramos: texto(guardado.cantidadGramos),
    unidadBase: guardado.unidadBase,
    medidas: guardado.medidas,
    medida: guardado.medida ?? "",
    cantidadMedida: texto(guardado.cantidadMedida),
    cantidadPorMedida: texto(guardado.cantidadPorMedida),
  };
}

/** El formulario → los campos de cantidad del DTO. */
export function cantidadParaGuardar(c: CantidadEnFormulario): {
  cantidadGramos: number | null;
  unidadBase: UnidadBaseAlimento;
  medidas: MedidaAlimento[];
  medida: string | null;
  cantidadMedida: number | null;
  cantidadPorMedida: number | null;
} {
  const conMedida = c.medida.trim() !== "";
  return {
    cantidadGramos: gramosEnFormulario(c),
    unidadBase: c.unidadBase,
    medidas: c.medidas,
    medida: conMedida ? c.medida : null,
    cantidadMedida: conMedida ? numero(c.cantidadMedida) : null,
    cantidadPorMedida: conMedida ? numero(c.cantidadPorMedida) : null,
  };
}

/**
 * La cantidad en g/ml que dice el formulario (espejo de
 * `normalizarCantidadDeAlimento`): con medida, cantidad × equivalencia.
 * Acepta un formulario sin los campos de medida (los alimentos de antes).
 */
export function gramosEnFormulario(
  c: Pick<CantidadEnFormulario, "cantidadGramos"> &
    Partial<
      Pick<
        CantidadEnFormulario,
        "medida" | "cantidadMedida" | "cantidadPorMedida"
      >
    >,
): number | null {
  if (c.medida && c.medida.trim() !== "") {
    const veces = numero(c.cantidadMedida);
    const porMedida = numero(c.cantidadPorMedida);
    if (veces == null || porMedida == null) return null;
    return Math.round(veces * porMedida * 10) / 10;
  }
  return numero(c.cantidadGramos);
}

/** Una opción del selector de medida. */
export interface OpcionMedida {
  /** Valor del Select: `base` o `m:<nombre>` (Radix no admite ""). */
  valor: string;
  /** «g», «taza (240 ml)». */
  etiqueta: string;
  medida: MedidaAlimento | null;
}

export const VALOR_BASE = "base";

/**
 * Las medidas que ofrece el selector: la unidad base, las propias del
 * alimento y las estándar de su unidad que no estén pisadas (espejo de
 * `medidasDisponibles`). Si la elegida ya no está en ninguna —una medida
 * estándar que cambió después de guardar el plan—, se suma con la
 * equivalencia guardada: lo entregado no se reescribe.
 */
export function opcionesDeMedida(c: CantidadEnFormulario): OpcionMedida[] {
  const simbolo = SIMBOLO_UNIDAD_BASE[c.unidadBase];
  const clave = (nombre: string) => nombre.trim().toLowerCase();
  const propias = new Set(c.medidas.map((m) => clave(m.nombre)));
  const medidas = [
    ...c.medidas,
    ...MEDIDAS_ESTANDAR[c.unidadBase].filter(
      (m) => !propias.has(clave(m.nombre)),
    ),
  ];
  const porMedida = numero(c.cantidadPorMedida);
  if (
    c.medida.trim() !== "" &&
    porMedida != null &&
    !medidas.some((m) => clave(m.nombre) === clave(c.medida))
  ) {
    medidas.unshift({ nombre: c.medida, cantidad: porMedida });
  }
  return [
    { valor: VALOR_BASE, etiqueta: simbolo, medida: null },
    ...medidas.map((m) => ({
      valor: `m:${m.nombre}`,
      etiqueta: `${m.nombre} (${formatear(m.cantidad)} ${simbolo})`,
      medida: m,
    })),
  ];
}

/** El valor del selector para la cantidad actual. */
export function valorDeMedida(c: CantidadEnFormulario): string {
  return c.medida.trim() === "" ? VALOR_BASE : `m:${c.medida}`;
}

/**
 * Cambiar de medida CONVIERTE la cantidad, no la pierde: 100 g de huevo
 * pasados a «unidad (50 g)» son 2 unidades, como al cambiar la porción en
 * FatSecret.
 */
export function cambiarMedida(
  c: CantidadEnFormulario,
  opcion: OpcionMedida,
): CantidadEnFormulario {
  const gramos = gramosEnFormulario(c);
  if (!opcion.medida) {
    return {
      ...c,
      medida: "",
      cantidadMedida: "",
      cantidadPorMedida: "",
      cantidadGramos: gramos != null ? texto(gramos) : c.cantidadGramos,
    };
  }
  const veces =
    gramos != null
      ? Math.round((gramos / opcion.medida.cantidad) * 100) / 100
      : 1;
  return {
    ...c,
    medida: opcion.medida.nombre,
    cantidadPorMedida: texto(opcion.medida.cantidad),
    cantidadMedida: texto(veces > 0 ? veces : 1),
    cantidadGramos: texto((veces > 0 ? veces : 1) * opcion.medida.cantidad),
  };
}

/** «g/100 g» o «g/100 ml» según la unidad del alimento. */
export function porCien(unidadBase: UnidadBaseAlimento): string {
  return `100 ${SIMBOLO_UNIDAD_BASE[unidadBase]}`;
}

function texto(valor: number | null | undefined): string {
  return valor == null ? "" : String(Math.round(valor * 100) / 100);
}

function numero(valor: string | null | undefined): number | null {
  if (valor == null) return null;
  const t = String(valor).trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatear(valor: number): string {
  return String(Math.round(valor * 100) / 100).replace(".", ",");
}
