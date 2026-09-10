import { z } from "zod";
import type { AvanceIA } from "@/dominio/servicios/avanceIA";

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

/**
 * La misma pregunta, pedida por el canal que transmite la respuesta en vivo.
 *
 * `intentoId` identifica ESTE envío y el servidor no lo mira. Está porque una
 * suscripción se identifica por el hash de su entrada: sin él, volver a
 * preguntar exactamente lo mismo dentro del mismo chat quedaría igual a la
 * suscripción anterior —ya cerrada— y el segundo mensaje no se enviaría nunca.
 */
export const preguntarEnVivoDto = preguntarDto.extend({
  intentoId: z.string().min(1).max(64),
});
export type PreguntarEnVivoDto = z.infer<typeof preguntarEnVivoDto>;

/**
 * Lo que viaja por la subscription mientras el asistente responde.
 *
 * `fin` cierra el flujo con el resultado COMPLETO (la respuesta entera y en qué
 * chat quedó guardada). No es redundante con los fragmentos: el cliente
 * necesita el `conversacionId` para seguir la charla, y quedarse con la
 * concatenación de los fragmentos lo dejaría dependiendo de no haber perdido
 * ninguno.
 *
 * `error` también CIERRA el flujo, y por eso es un evento y no una excepción:
 * tRPC trata como reintentables los errores de una subscription SSE (500, 502,
 * 503, 504) y reconecta solo. Como acá cada conexión llama al modelo y cobra,
 * un fallo lanzado se convertiría en un bucle de llamadas facturadas contra la
 * clave del profesional. Emitido como evento, el flujo termina una vez y el
 * cliente decide qué mostrar.
 *
 * No lleva esquema de Zod: no es una ENTRADA que haya que validar, es la salida
 * de un procedimiento, y su tipo lo infiere el cliente del router.
 */
export type EventoIA<T> =
  AvanceIA | { tipo: "fin"; resultado: T } | { tipo: "error"; mensaje: string };

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
