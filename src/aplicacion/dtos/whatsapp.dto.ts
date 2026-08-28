import { z } from "zod";
import {
  ESTADOS_RECORDATORIO_WHATSAPP,
  type EstadoRecordatorioWhatsapp,
} from "@/dominio/entidades/RecordatorioWhatsapp";
import { MAX_LARGO_PLANTILLA_WHATSAPP } from "@/dominio/casos-de-uso/whatsapp/plantilla";
import {
  DIRECCIONES_WHATSAPP,
  ESTADOS_MENSAJE_WHATSAPP,
} from "@/dominio/entidades/MensajeWhatsapp";

/** DTOs del recordatorio de turno por WhatsApp. */

export const vistaPreviaRecordatorioDto = z.object({ turnoId: z.string().min(1) });
export type VistaPreviaRecordatorioDto = z.infer<typeof vistaPreviaRecordatorioDto>;

export const prepararRecordatorioDto = z.object({
  turnoId: z.string().min(1),
  /** Texto retocado en el diálogo; si falta se usa la plantilla configurada. */
  mensaje: z.string().max(MAX_LARGO_PLANTILLA_WHATSAPP).optional().nullable(),
});
export type PrepararRecordatorioDto = z.infer<typeof prepararRecordatorioDto>;

export const confirmarRecordatorioDto = z.object({
  recordatorioId: z.string().min(1),
  enviado: z.boolean(),
});
export type ConfirmarRecordatorioDto = z.infer<typeof confirmarRecordatorioDto>;

export const vistaPreviaSalidaDto = z.object({
  turnoId: z.string(),
  pacienteId: z.string(),
  nombrePaciente: z.string(),
  telefono: z.string(),
  mensaje: z.string(),
  enlace: z.string().nullable(),
  modo: z.enum(["ENLACE", "API"]),
});
export type VistaPreviaSalidaDto = z.infer<typeof vistaPreviaSalidaDto>;

export const recordatorioPreparadoSalidaDto = z.object({
  recordatorioId: z.string(),
  telefono: z.string(),
  mensaje: z.string(),
  enlace: z.string().nullable(),
  modo: z.enum(["ENLACE", "API"]),
});
export type RecordatorioPreparadoSalidaDto = z.infer<typeof recordatorioPreparadoSalidaDto>;

/** Estado del recordatorio que viaja embebido en el DTO de turno. */
export const recordatorioSalidaDto = z.object({
  id: z.string(),
  estado: z.enum(ESTADOS_RECORDATORIO_WHATSAPP),
  creadoEn: z.date(),
  confirmadoEn: z.date().nullable(),
});
export type RecordatorioSalidaDto = z.infer<typeof recordatorioSalidaDto>;

export type { EstadoRecordatorioWhatsapp };

/** ---- Fase B: hilo de WhatsApp dentro de la app ---- */

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
