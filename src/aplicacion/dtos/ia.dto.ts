import { z } from "zod";

/** DTOs del módulo de IA (asistente + análisis de comida + insights). */

/** Pregunta al asistente: sin conversacionId abre un chat nuevo. */
export const preguntarDto = z.object({
  pregunta: z.string().min(1, "Escribí tu consulta").max(2000),
  conversacionId: z.string().min(1).optional().nullable(),
});
export type PreguntarDto = z.infer<typeof preguntarDto>;

/** Consulta analítica del profesional: mismo par pregunta + chat. */
export const analizarDto = preguntarDto;
export type AnalizarDto = z.infer<typeof analizarDto>;

export const analizarComidaDto = z.object({
  archivoId: z.string().optional().nullable(),
  descripcion: z.string().max(500).optional().nullable(),
});
export type AnalizarComidaDto = z.infer<typeof analizarComidaDto>;

/** Lo que vuelve de una pregunta: el turno y en qué chat quedó guardado. */
export const respuestaAsistenteDto = z.object({
  conversacionId: z.string(),
  pregunta: z.string(),
  respuesta: z.string(),
});
export type RespuestaAsistenteDto = z.infer<typeof respuestaAsistenteDto>;

export const respuestaAnalisisDto = respuestaAsistenteDto;
export type RespuestaAnalisisDto = z.infer<typeof respuestaAnalisisDto>;

export const idConversacionIADto = z.object({ id: z.string().min(1) });

export const resumenConversacionIADto = z.object({
  id: z.string(),
  titulo: z.string(),
  cantidadMensajes: z.number(),
  actualizadoEn: z.date(),
});
export type ResumenConversacionIADto = z.infer<typeof resumenConversacionIADto>;

export const mensajeIASalidaDto = z.object({
  id: z.string(),
  rol: z.enum(["USUARIO", "ASISTENTE"]),
  contenido: z.string(),
  creadoEn: z.date(),
});

export const conversacionIASalidaDto = z.object({
  id: z.string(),
  titulo: z.string(),
  mensajes: z.array(mensajeIASalidaDto),
  actualizadoEn: z.date(),
});
export type ConversacionIASalidaDto = z.infer<typeof conversacionIASalidaDto>;

export const resultadoAnalisisComidaDto = z.object({
  descripcion: z.string(),
  porcionEstimada: z.string(),
  calorias: z.number(),
  proteinasG: z.number(),
  carbohidratosG: z.number(),
  grasasG: z.number(),
  confianza: z.number(),
  nota: z.string(),
});
export type ResultadoAnalisisComidaDto = z.infer<
  typeof resultadoAnalisisComidaDto
>;

export const insightPacienteDto = z.object({
  tipo: z.string(),
  titulo: z.string(),
  detalle: z.string(),
  severidad: z.enum(["INFO", "ATENCION", "CRITICO"]),
  pacienteId: z.string().nullable(),
});
export type InsightPacienteDto = z.infer<typeof insightPacienteDto>;

/** Corrección del profesional sobre un insight (loop de feedback). */
export const feedbackInsightDto = z.object({
  pacienteId: z.string().min(1),
  tipoInsight: z.string().min(1).max(60),
  util: z.boolean(),
  detalle: z.string().max(1000),
  comentario: z.string().max(1000).nullable().optional(),
});
export type FeedbackInsightDto = z.infer<typeof feedbackInsightDto>;
