import type { EstadoTurno } from "@/dominio/entidades/Turno";
import type { TipoComida } from "@/dominio/entidades/Dieta";

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

/** Convierte una fecha a YYYY-MM-DD (UTC). */
export function aFechaISO(fecha: Date | string | null | undefined): string {
  if (!fecha) return "";
  return new Date(fecha).toISOString().slice(0, 10);
}

export const ETIQUETAS_ESTADO_TURNO: Record<EstadoTurno, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  COMPLETADO: "Completado",
};

export const ETIQUETAS_TIPO_COMIDA: Record<TipoComida, string> = {
  DESAYUNO: "Desayuno",
  ALMUERZO: "Almuerzo",
  MERIENDA: "Merienda",
  CENA: "Cena",
};

/** Orden canónico de los tipos de comida para mostrarlos. */
export const ORDEN_TIPOS_COMIDA: TipoComida[] = [
  "DESAYUNO",
  "ALMUERZO",
  "MERIENDA",
  "CENA",
];
