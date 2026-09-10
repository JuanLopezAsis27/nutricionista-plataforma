import { z } from "zod";

/** DTOs de Mensajería. */

export const enviarMensajeNutriDto = z.object({
  pacienteId: z.string().min(1),
  cuerpo: z.string().min(1, "Escribí un mensaje").max(4000),
});
export type EnviarMensajeNutriDto = z.infer<typeof enviarMensajeNutriDto>;

export const enviarMiMensajeDto = z.object({
  cuerpo: z.string().min(1, "Escribí un mensaje").max(4000),
});
export type EnviarMiMensajeDto = z.infer<typeof enviarMiMensajeDto>;

export const pacienteObjetivoDto = z.object({ pacienteId: z.string().min(1) });

export const mensajeSalidaDto = z.object({
  id: z.string(),
  conversacionId: z.string(),
  autorId: z.string(),
  cuerpo: z.string(),
  leidoEn: z.date().nullable(),
  creadoEn: z.date(),
});
export type MensajeSalidaDto = z.infer<typeof mensajeSalidaDto>;

export const conversacionSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
});
export type ConversacionSalidaDto = z.infer<typeof conversacionSalidaDto>;

/**
 * Con quién se está hablando: la contraparte del hilo.
 *
 * Va en el hilo y no en una query aparte porque el encabezado y las burbujas la
 * necesitan al mismo tiempo que los mensajes: pedirla por separado dibujaba el
 * chat completo y recién después le aparecía la cara al interlocutor.
 */
export const contraparteHiloDto = z.object({
  nombre: z.string(),
  /** Archivo del bucket; se lee por /api/archivos/<id>/ver. Null = iniciales. */
  fotoArchivoId: z.string().nullable(),
});
export type ContraparteHiloDto = z.infer<typeof contraparteHiloDto>;

export const hiloSalidaDto = z.object({
  conversacion: conversacionSalidaDto,
  contraparte: contraparteHiloDto,
  mensajes: z.array(mensajeSalidaDto),
});
export type HiloSalidaDto = z.infer<typeof hiloSalidaDto>;

export const resumenConversacionDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  pacienteNombre: z.string(),
  /** Foto de perfil del paciente, para el avatar de la bandeja. Null = iniciales. */
  pacienteFotoArchivoId: z.string().nullable(),
  ultimoMensajeTexto: z.string().nullable(),
  ultimoMensajeEn: z.date().nullable(),
  noLeidos: z.number(),
});
export type ResumenConversacionDto = z.infer<typeof resumenConversacionDto>;
