import { z } from "zod";
import {
  AMBITOS_AXIOMA,
  OPERADORES_AXIOMA,
} from "@/dominio/entidades/AxiomaNutricional";

/** DTOs de la Base de conocimiento (axiomas nutricionales). */

export const crearAxiomaDto = z.object({
  ambito: z.enum(AMBITOS_AXIOMA),
  parametro: z.string().min(1, "Indicá el parámetro").max(60),
  operador: z.enum(OPERADORES_AXIOMA),
  valor: z.number().nullable().optional(),
  valorMax: z.number().nullable().optional(),
  unidad: z.string().max(20).nullable().optional(),
  texto: z.string().min(1, "Escribí el texto del axioma").max(1000),
  prioridad: z.number().int().min(0).max(100).optional(),
  activo: z.boolean().optional(),
});
export type CrearAxiomaDto = z.infer<typeof crearAxiomaDto>;

export const actualizarAxiomaDto = z.intersection(
  crearAxiomaDto.partial(),
  z.object({ id: z.string().min(1) }),
);
export type ActualizarAxiomaDto = z.infer<typeof actualizarAxiomaDto>;

export const idAxiomaDto = z.object({ id: z.string().min(1) });

export const axiomaSalidaDto = z.object({
  id: z.string(),
  ambito: z.enum(AMBITOS_AXIOMA),
  parametro: z.string(),
  operador: z.enum(OPERADORES_AXIOMA),
  valor: z.number().nullable(),
  valorMax: z.number().nullable(),
  unidad: z.string().nullable(),
  texto: z.string(),
  prioridad: z.number(),
  activo: z.boolean(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type AxiomaSalidaDto = z.infer<typeof axiomaSalidaDto>;
