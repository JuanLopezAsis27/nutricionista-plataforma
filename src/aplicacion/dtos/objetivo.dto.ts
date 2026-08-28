import { z } from "zod";
import {
  PRIORIDADES_OBJETIVO,
  ESTADOS_OBJETIVO,
  ESTADOS_ESTRATEGIA,
  TIPOS_EVENTO_OBJETIVO,
} from "@/dominio/entidades/Objetivo";

/** DTOs de Objetivos — esquemas Zod de entrada/salida. */

export const crearObjetivoDto = z.object({
  pacienteId: z.string().min(1),
  titulo: z.string().min(1, "El título es obligatorio").max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  prioridad: z.enum(PRIORIDADES_OBJETIVO).optional(),
  fechaObjetivo: z.coerce.date().optional().nullable(),
  /** Meta numérica de composición que este plan busca alcanzar. */
  objetivoComposicionId: z.string().min(1).optional().nullable(),
});
export type CrearObjetivoDto = z.infer<typeof crearObjetivoDto>;

export const actualizarObjetivoDto = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(2000).optional().nullable(),
  prioridad: z.enum(PRIORIDADES_OBJETIVO).optional(),
  fechaObjetivo: z.coerce.date().optional().nullable(),
  /** null desvincula la meta; omitirlo deja el vínculo como está. */
  objetivoComposicionId: z.string().min(1).optional().nullable(),
});
export type ActualizarObjetivoDto = z.infer<typeof actualizarObjetivoDto>;

export const cambiarEstadoObjetivoDto = z.object({
  id: z.string().min(1),
  estado: z.enum(ESTADOS_OBJETIVO),
  motivo: z.string().min(1, "Indicá el motivo del cambio").max(1000),
});
export type CambiarEstadoObjetivoDto = z.infer<typeof cambiarEstadoObjetivoDto>;

export const idObjetivoDto = z.object({ id: z.string().min(1) });
export type IdObjetivoDto = z.infer<typeof idObjetivoDto>;

export const agregarEstrategiaDto = z.object({
  objetivoId: z.string().min(1),
  descripcion: z.string().min(1, "La descripción es obligatoria").max(1000),
  motivo: z.string().min(1, "Indicá por qué elegiste esta estrategia").max(1000),
});
export type AgregarEstrategiaDto = z.infer<typeof agregarEstrategiaDto>;

export const cambiarEstadoEstrategiaDto = z.object({
  objetivoId: z.string().min(1),
  estrategiaId: z.string().min(1),
  estado: z.enum(ESTADOS_ESTRATEGIA),
  motivo: z.string().min(1, "Indicá el motivo del cambio").max(1000),
});
export type CambiarEstadoEstrategiaDto = z.infer<typeof cambiarEstadoEstrategiaDto>;

export const eliminarEstrategiaDto = z.object({
  objetivoId: z.string().min(1),
  estrategiaId: z.string().min(1),
});
export type EliminarEstrategiaDto = z.infer<typeof eliminarEstrategiaDto>;

// --- Salida ------------------------------------------------------------------

const estrategiaSalida = z.object({
  id: z.string(),
  descripcion: z.string(),
  motivo: z.string(),
  estado: z.enum(ESTADOS_ESTRATEGIA),
  creadoEn: z.date(),
});

export const objetivoSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  objetivoComposicionId: z.string().nullable(),
  titulo: z.string(),
  descripcion: z.string().nullable(),
  prioridad: z.enum(PRIORIDADES_OBJETIVO),
  estado: z.enum(ESTADOS_OBJETIVO),
  fechaObjetivo: z.date().nullable(),
  estrategias: z.array(estrategiaSalida),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type ObjetivoSalidaDto = z.infer<typeof objetivoSalidaDto>;

export const eventoObjetivoSalidaDto = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_EVENTO_OBJETIVO),
  detalle: z.string(),
  motivo: z.string().nullable(),
  creadoEn: z.date(),
});
export type EventoObjetivoSalidaDto = z.infer<typeof eventoObjetivoSalidaDto>;
