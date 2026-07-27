import { z } from "zod";

/** DTOs de Secretaría — plantillas de email y envíos. */

// --- Plantillas --------------------------------------------------------------

export const crearPlantillaDto = z.object({
  clave: z.string().min(1).max(60),
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
  asunto: z.string().min(1, "El asunto es obligatorio").max(200),
  cuerpoHtml: z.string().min(1, "El cuerpo es obligatorio").max(20_000),
  descripcion: z.string().max(500).optional().nullable(),
});
export type CrearPlantillaDto = z.infer<typeof crearPlantillaDto>;

export const actualizarPlantillaDto = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
  asunto: z.string().min(1, "El asunto es obligatorio").max(200),
  cuerpoHtml: z.string().min(1, "El cuerpo es obligatorio").max(20_000),
  descripcion: z.string().max(500).optional().nullable(),
});
export type ActualizarPlantillaDto = z.infer<typeof actualizarPlantillaDto>;

export const idPlantillaDto = z.object({ id: z.string().min(1) });

export const enviarPruebaDto = z.object({
  plantillaId: z.string().min(1),
  para: z.string().email("Ingresá un email válido"),
});
export type EnviarPruebaDto = z.infer<typeof enviarPruebaDto>;

export const plantillaSalidaDto = z.object({
  id: z.string(),
  clave: z.string(),
  nombre: z.string(),
  asunto: z.string(),
  cuerpoHtml: z.string(),
  descripcion: z.string().nullable(),
  deSistema: z.boolean(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type PlantillaSalidaDto = z.infer<typeof plantillaSalidaDto>;

// --- Envíos ------------------------------------------------------------------

export const emailEnviadoSalidaDto = z.object({
  id: z.string(),
  plantillaClave: z.string(),
  para: z.string(),
  asunto: z.string(),
  referenciaId: z.string().nullable(),
  pacienteId: z.string().nullable(),
  error: z.string().nullable(),
  creadoEn: z.date(),
});
export type EmailEnviadoSalidaDto = z.infer<typeof emailEnviadoSalidaDto>;

export const resultadoRecordatoriosDto = z.object({
  enviados: z.number(),
  omitidos: z.number(),
  fallidos: z.number(),
});
export type ResultadoRecordatoriosDto = z.infer<typeof resultadoRecordatoriosDto>;
