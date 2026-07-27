import type { EstadoTurno } from "@/dominio/entidades/Turno";
import type {
  TipoAlertaAlimentaria,
  SeveridadAlerta,
} from "@/dominio/entidades/AlertaAlimentaria";

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

export function formatearFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";
  return formateadorFecha.format(new Date(fecha));
}

export function formatearFechaLarga(fecha: Date | string | null | undefined): string {
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

export const ETIQUETAS_TIPO_ALERTA: Record<TipoAlertaAlimentaria, string> = {
  ALERGIA: "Alergia",
  INTOLERANCIA: "Intolerancia",
  RESTRICCION: "Restricción",
};

export const ETIQUETAS_SEVERIDAD: Record<SeveridadAlerta, string> = {
  LEVE: "Leve",
  MODERADA: "Moderada",
  SEVERA: "Severa",
};

const formateadorNumero = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1,
});

/** Formatea un número con hasta 1 decimal (es-AR); "—" si es null. */
export function formatearNumero(valor: number | null | undefined): string {
  return valor == null ? "—" : formateadorNumero.format(valor);
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
