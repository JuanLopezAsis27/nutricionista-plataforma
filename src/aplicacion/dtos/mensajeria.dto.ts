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

export const hiloSalidaDto = z.object({
  conversacion: conversacionSalidaDto,
  mensajes: z.array(mensajeSalidaDto),
});
export type HiloSalidaDto = z.infer<typeof hiloSalidaDto>;

export const resumenConversacionDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  pacienteNombre: z.string(),
  ultimoMensajeTexto: z.string().nullable(),
  ultimoMensajeEn: z.date().nullable(),
  noLeidos: z.number(),
});
export type ResumenConversacionDto = z.infer<typeof resumenConversacionDto>;
