import { z } from "zod";
import {
  DIRECCIONES_WHATSAPP,
  ESTADOS_MENSAJE_WHATSAPP,
} from "@/dominio/entidades/MensajeWhatsapp";

/**
 * DTOs del CANAL de WhatsApp: el hilo de mensajes con un paciente.
 *
 * Los del recordatorio de turno viven en `recordatorios.dto`, junto al resto
 * de esa tarea.
 */

export const enviarMensajeWhatsappDto = z.object({
  pacienteId: z.string().min(1),
  cuerpo: z.string().min(1, "Escribí un mensaje").max(4096),
});
export type EnviarMensajeWhatsappDto = z.infer<typeof enviarMensajeWhatsappDto>;

export const mensajeWhatsappSalidaDto = z.object({
  id: z.string(),
  pacienteId: z.string(),
  direccion: z.enum(DIRECCIONES_WHATSAPP),
  cuerpo: z.string(),
  estado: z.enum(ESTADOS_MENSAJE_WHATSAPP),
  error: z.string().nullable(),
  creadoEn: z.date(),
});
export type MensajeWhatsappSalidaDto = z.infer<typeof mensajeWhatsappSalidaDto>;

export const hiloWhatsappSalidaDto = z.object({
  /** false = el inquilino no tiene la API oficial conectada. */
  conectado: z.boolean(),
  mensajes: z.array(mensajeWhatsappSalidaDto),
  /** Meta solo permite texto libre dentro de las 24 h del último mensaje del paciente. */
  ventanaAbierta: z.boolean(),
  ventanaVenceEn: z.date().nullable(),
});
export type HiloWhatsappSalidaDto = z.infer<typeof hiloWhatsappSalidaDto>;
