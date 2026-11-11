import type { EstadoTurno } from "@/dominio/entidades/Turno";

/** Utilidades de formato y etiquetas legibles, en español (es-AR). */

const formateadorFecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const formateadorFechaLarga = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatearFecha(
  fecha: Date | string | null | undefined,
): string {
  if (!fecha) return "—";
  return formateadorFecha.format(new Date(fecha));
}

/**
 * Fecha y hora de un INSTANTE (`creadoEn`, `generadoEn`), en la zona horaria de
 * quien mira.
 *
 * Va sin `timeZone: "UTC"`, al revés que `formatearFecha`: aquella formatea
 * columnas `DATE` —que llegan como medianoche UTC y se correrían un día al
 * pasarlas a hora local—, y esto formatea un momento real, donde lo que se
 * quiere ver es la hora del reloj de la pared.
 */
const formateadorFechaHora = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatearFechaHora(
  fecha: Date | string | null | undefined,
): string {
  if (!fecha) return "—";
  return formateadorFechaHora.format(new Date(fecha));
}

export function formatearFechaLarga(
  fecha: Date | string | null | undefined,
): string {
  if (!fecha) return "—";
  return formateadorFechaLarga.format(new Date(fecha));
}

/** Devuelve la fecha de hoy en formato YYYY-MM-DD (para inputs date). */
export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Fecha de HOY según el reloj local del navegador (YYYY-MM-DD).
 * Para el diario del paciente: su "hoy" es el de su huso horario,
 * nunca el del servidor.
 */
export function hoyLocalISO(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Convierte una fecha a YYYY-MM-DD (UTC). */
export function aFechaISO(fecha: Date | string | null | undefined): string {
  if (!fecha) return "";
  return new Date(fecha).toISOString().slice(0, 10);
}

/**
 * ¿Una columna DATE (una competencia, un turno) ya pasó? HOY no cuenta como
 * pasado.
 *
 * Compara DÍAS y no instantes: el DATE llega como medianoche UTC, y contra la
 * medianoche LOCAL —`hoy.setHours(0, 0, 0, 0)`— al oeste de Greenwich el día
 * de hoy queda «antes de hoy»: la carrera de hoy figuraba como terminada.
 */
export function esFechaPasada(fecha: Date | string): boolean {
  return aFechaISO(fecha) < hoyLocalISO();
}

const ZONA_ARGENTINA = "America/Argentina/Buenos_Aires";

// en-CA formatea como YYYY-MM-DD, ideal para comparar e inicializar inputs date.
const formateadorFechaArg = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_ARGENTINA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formateadorHoraArg = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA_ARGENTINA,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Fecha de HOY en horario argentino (YYYY-MM-DD), independiente del huso del navegador. */
export function hoyArgentinaISO(): string {
  return formateadorFechaArg.format(new Date());
}

/** Hora actual en horario argentino como "HH:mm". */
export function horaArgentinaHHmm(): string {
  return formateadorHoraArg.format(new Date());
}

export const ETIQUETAS_ESTADO_TURNO: Record<EstadoTurno, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  COMPLETADO: "Completado",
};

/**
 * Texto del botón que lleva un turno de `desde` a `hacia`. Casi siempre es el
 * nombre del estado al que va; la excepción es deshacer un completado, que con
 * un «Confirmado» suelto al lado de la etiqueta «Completado» no se entiende.
 */
export function etiquetaTransicionTurno(
  desde: EstadoTurno,
  hacia: EstadoTurno,
): string {
  if (desde === "COMPLETADO" && hacia === "CONFIRMADO") {
    return "Volver a confirmado";
  }
  return ETIQUETAS_ESTADO_TURNO[hacia];
}

/**
 * Lo que se pierde, además del turno, al borrar un cancelado con cobro: el
 * cobro deja de contar en los ingresos. `null` si no tiene cobro.
 */
export function avisoCobroAlBorrarTurno(turno: {
  precio: number | null;
  pagado: boolean;
}): string | null {
  if (turno.precio == null && !turno.pagado) return null;
  const monto =
    turno.precio != null
      ? `${formatearMoneda(turno.precio)}${turno.pagado ? ", pagado" : ", sin pagar"}`
      : "pagado";
  return `Tiene un cobro registrado (${monto}): se borra con el turno y deja de contar en los ingresos.`;
}

const formateadorNumero = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
});

/** Formatea un número con hasta 1 decimal (es-AR); "—" si es null. */
export function formatearNumero(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorNumero.format(valor);
}

const formateadorMedida = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Medida antropométrica con SIEMPRE dos decimales (es-AR); "—" si es null.
 *
 * Es el formato de toda la sección de composición corporal, y son dos
 * decimales por dos motivos distintos:
 *
 *   - **No perder precisión que el cálculo sí tiene.** El dominio redondea el
 *     porcentaje graso, el IMC y los porcentajes de las masas a dos decimales;
 *     con `formatearNumero` la pantalla los recortaba a uno y un 18,75 % se
 *     leía 18,8 %. Entre dos consultas, ese redondeo se come diferencias
 *     reales.
 *   - **Que las columnas se lean.** Los números van con `tabular-nums` en
 *     tablas y tarjetas comparativas; con la cantidad de decimales variable,
 *     las comas no se alinean y la comparación visual entre filas se pierde.
 *
 * Por eso el mínimo también es 2: rellenar con el cero es deliberado, no un
 * descuido. La EDAD no usa este formato —"30,00 años" no es una medida—, y
 * fuera de antropometría sigue rigiendo `formatearNumero`.
 */
export function formatearMedida(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorMedida.format(valor);
}

const formateadorMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** Formatea un monto en pesos argentinos ("$ 15.000"); "—" si es null. */
export function formatearMoneda(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorMoneda.format(valor);
}

/** Tamaño de archivo legible ("240 KB", "1,2 MB"). */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${formateadorNumero.format(bytes / (1024 * 1024))} MB`;
}
