import { z } from "zod";
import {
  ESTADOS_RECORDATORIO_WHATSAPP,
  ORIGENES_RECORDATORIO,
} from "@/dominio/entidades/RecordatorioWhatsapp";
import {
  VARIABLES_RECORDATORIO,
  MAX_LARGO_CUERPO_PLANTILLA,
  MAX_VARIABLES_META,
} from "@/dominio/entidades/PlantillaWhatsapp";
import {
  MAX_AVISOS_POR_MEDIO,
  MAX_DIAS_ANTES,
  MAX_MINUTOS_ANTES,
  MAX_HORAS_ENTRE_AVISOS,
} from "@/dominio/entidades/ConfiguracionRecordatorios";
import { ESTADOS_TURNO } from "@/dominio/entidades/Turno";
import { MAX_TURNOS_POR_LOTE } from "@/aplicacion/casos-de-uso/recordatorios/EnviarRecordatoriosMasivos";
import { MAX_DIAS_VENTANA } from "@/aplicacion/casos-de-uso/recordatorios/ListarTurnosParaRecordar";

/** ---- Configuración de medios y programación ---- */

const diasAntes = z
  .array(z.number().int().min(0).max(MAX_DIAS_ANTES))
  .max(MAX_AVISOS_POR_MEDIO);

export const guardarConfiguracionRecordatoriosDto = z.object({
  whatsappActivo: z.boolean().optional(),
  whatsappAutomatico: z.boolean().optional(),
  whatsappDiasAntes: diasAntes.optional(),
  emailActivo: z.boolean().optional(),
  emailAutomatico: z.boolean().optional(),
  emailDiasAntes: diasAntes.optional(),
  calendarioActivo: z.boolean().optional(),
  calendarioInvitarPaciente: z.boolean().optional(),
  calendarioMinutosAntes: z
    .array(z.number().int().min(0).max(MAX_MINUTOS_ANTES))
    .max(MAX_AVISOS_POR_MEDIO)
    .optional(),
  horaEnvio: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm.")
    .optional(),
  horasEntreAvisos: z
    .number()
    .int()
    .min(1)
    .max(MAX_HORAS_ENTRE_AVISOS)
    .optional(),
});
export type GuardarConfiguracionRecordatoriosDto = z.infer<
  typeof guardarConfiguracionRecordatoriosDto
>;

export const configuracionRecordatoriosSalidaDto = z.object({
  whatsappActivo: z.boolean(),
  whatsappAutomatico: z.boolean(),
  whatsappDiasAntes: z.array(z.number()),
  emailActivo: z.boolean(),
  emailAutomatico: z.boolean(),
  emailDiasAntes: z.array(z.number()),
  calendarioActivo: z.boolean(),
  calendarioInvitarPaciente: z.boolean(),
  calendarioMinutosAntes: z.array(z.number()),
  horaEnvio: z.string(),
  horasEntreAvisos: z.number(),
  /**
   * Estado real de las integraciones de las que depende cada medio. La UI lo
   * usa para explicar por qué un medio activo puede no estar mandando: sin
   * Google conectado, el calendario no manda aunque el interruptor diga que sí.
   */
  whatsappConectado: z.boolean(),
  googleConectado: z.boolean(),
});
export type ConfiguracionRecordatoriosSalidaDto = z.infer<
  typeof configuracionRecordatoriosSalidaDto
>;

/** ---- Plantillas de WhatsApp ---- */

export const variableRecordatorioDto = z.enum(VARIABLES_RECORDATORIO);

export const guardarPlantillaWhatsappDto = z.object({
  nombre: z.string().min(1, "Poné un nombre.").max(80),
  cuerpo: z
    .string()
    .min(1, "Escribí el mensaje.")
    .max(MAX_LARGO_CUERPO_PLANTILLA),
  claveMeta: z.string().max(512).nullable().optional(),
  idiomaMeta: z.string().min(2).max(10).optional(),
  variablesMeta: z
    .array(variableRecordatorioDto)
    .max(MAX_VARIABLES_META)
    .optional(),
  predeterminada: z.boolean().optional(),
  activa: z.boolean().optional(),
});
export type GuardarPlantillaWhatsappDto = z.infer<
  typeof guardarPlantillaWhatsappDto
>;

export const actualizarPlantillaWhatsappDto = guardarPlantillaWhatsappDto
  .partial()
  .extend({ id: z.string().min(1) });
export type ActualizarPlantillaWhatsappDto = z.infer<
  typeof actualizarPlantillaWhatsappDto
>;

export const idPlantillaWhatsappDto = z.object({ id: z.string().min(1) });

export const plantillaWhatsappSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  cuerpo: z.string(),
  claveMeta: z.string().nullable(),
  idiomaMeta: z.string(),
  variablesMeta: z.array(variableRecordatorioDto),
  predeterminada: z.boolean(),
  activa: z.boolean(),
  /** Puede salir sola por la Cloud API fuera de la ventana de 24 h. */
  admiteEnvioPorApi: z.boolean(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type PlantillaWhatsappSalidaDto = z.infer<
  typeof plantillaWhatsappSalidaDto
>;

/** ---- Consola de envío ---- */

export const listarTurnosParaRecordarDto = z.object({
  dias: z.number().int().min(0).max(MAX_DIAS_VENTANA).optional(),
});

export const avisoPrevioSalidaDto = z.object({
  id: z.string(),
  estado: z.enum(ESTADOS_RECORDATORIO_WHATSAPP),
  diasAntes: z.number().nullable(),
  creadoEn: z.date(),
  respondidoEn: z.date().nullable(),
});

export const turnoParaRecordarSalidaDto = z.object({
  turnoId: z.string(),
  pacienteId: z.string(),
  nombrePaciente: z.string(),
  telefono: z.string().nullable(),
  fecha: z.date(),
  hora: z.string(),
  estadoTurno: z.enum(ESTADOS_TURNO),
  diasFaltantes: z.number(),
  avisos: z.array(avisoPrevioSalidaDto),
  yaAvisado: z.boolean(),
  impedimento: z.string().nullable(),
});
export type TurnoParaRecordarSalidaDto = z.infer<
  typeof turnoParaRecordarSalidaDto
>;

/** ---- Vista previa y envío con texto retocado ---- */

export const vistaPreviaRecordatorioDto = z.object({
  turnoId: z.string().min(1),
  plantillaId: z.string().min(1).nullable().optional(),
});

export const vistaPreviaSalidaDto = z.object({
  turnoId: z.string(),
  pacienteId: z.string(),
  nombrePaciente: z.string(),
  telefono: z.string(),
  mensaje: z.string(),
  modo: z.enum(["ENLACE", "API"]),
  usaPlantillaAprobada: z.boolean(),
});
export type VistaPreviaSalidaDto = z.infer<typeof vistaPreviaSalidaDto>;

export const enviarRecordatorioIndividualDto = z.object({
  turnoId: z.string().min(1),
  plantillaId: z.string().min(1).nullable().optional(),
  /** Texto retocado en el diálogo; si falta se usa el de la plantilla. */
  mensaje: z.string().max(MAX_LARGO_CUERPO_PLANTILLA).nullable().optional(),
  forzar: z.boolean().optional(),
});
export type EnviarRecordatorioIndividualDto = z.infer<
  typeof enviarRecordatorioIndividualDto
>;

export const enviarRecordatoriosMasivosDto = z.object({
  turnoIds: z.array(z.string().min(1)).min(1).max(MAX_TURNOS_POR_LOTE),
  plantillaId: z.string().min(1).nullable().optional(),
  /** Insiste aunque el paciente ya haya recibido el aviso de ese turno. */
  forzar: z.boolean().optional(),
});
export type EnviarRecordatoriosMasivosDto = z.infer<
  typeof enviarRecordatoriosMasivosDto
>;

export const detalleEnvioMasivoSalidaDto = z.object({
  turnoId: z.string(),
  pacienteId: z.string(),
  nombrePaciente: z.string(),
  estado: z.enum(["ENVIADO", "PREPARADO", "OMITIDO", "FALLIDO"]),
  motivo: z.string().nullable(),
  enlace: z.string().nullable(),
  emailEnviado: z.boolean(),
});

export const resultadoEnvioMasivoSalidaDto = z.object({
  enviados: z.number(),
  preparados: z.number(),
  omitidos: z.number(),
  fallidos: z.number(),
  emailsEnviados: z.number(),
  detalles: z.array(detalleEnvioMasivoSalidaDto),
});
export type ResultadoEnvioMasivoSalidaDto = z.infer<
  typeof resultadoEnvioMasivoSalidaDto
>;

/** ---- Seguimiento ---- */

export const listarSeguimientoDto = z.object({
  limite: z.number().int().positive().max(100).optional(),
});

export const seguimientoRecordatorioSalidaDto = z.object({
  pacienteId: z.string(),
  nombrePaciente: z.string(),
  recordatorioId: z.string(),
  estado: z.enum(ESTADOS_RECORDATORIO_WHATSAPP),
  enviadoEn: z.date(),
  diasAntes: z.number().nullable(),
  turnoId: z.string(),
  fechaTurno: z.date().nullable(),
  horaTurno: z.string().nullable(),
  ultimoMensaje: z.string().nullable(),
  ultimoMensajeEn: z.date().nullable(),
  respondio: z.boolean(),
  confirmo: z.boolean(),
  ventanaAbierta: z.boolean(),
});
export type SeguimientoRecordatorioSalidaDto = z.infer<
  typeof seguimientoRecordatorioSalidaDto
>;

/** Lo que pasó en un medio durante el barrido. */
export const resultadoMedioSalidaDto = z.object({
  corrio: z.boolean(),
  enviados: z.number(),
  omitidos: z.number(),
  fallidos: z.number(),
  motivo: z.string().nullable(),
});

export const resultadoProgramadosSalidaDto = z.object({
  corrio: z.boolean(),
  motivo: z.string().nullable(),
  whatsapp: resultadoMedioSalidaDto,
  email: resultadoMedioSalidaDto,
  enviados: z.number(),
});
export type ResultadoProgramadosSalidaDto = z.infer<
  typeof resultadoProgramadosSalidaDto
>;

export const origenRecordatorioDto = z.enum(ORIGENES_RECORDATORIO);

/** ---- Pendientes de confirmar (canal enlace wa.me) ---- */

export const recordatorioPendienteSalidaDto = z.object({
  recordatorioId: z.string(),
  pacienteId: z.string(),
  nombrePaciente: z.string(),
  turnoId: z.string(),
  fechaTurno: z.date().nullable(),
  horaTurno: z.string().nullable(),
  mensaje: z.string(),
  telefono: z.string(),
  enlace: z.string(),
  abiertoEn: z.date(),
});
export type RecordatorioPendienteSalidaDto = z.infer<
  typeof recordatorioPendienteSalidaDto
>;

export const confirmarEnvioDto = z.object({
  recordatorioId: z.string().min(1),
  /** true = lo mandé; false = finalmente no lo mandé (queda DESCARTADO). */
  enviado: z.boolean(),
});
export type ConfirmarEnvioDto = z.infer<typeof confirmarEnvioDto>;

/** Estado resumido de un recordatorio, tras confirmarlo o descartarlo. */
export const recordatorioSalidaDto = z.object({
  id: z.string(),
  estado: z.enum(ESTADOS_RECORDATORIO_WHATSAPP),
  creadoEn: z.date(),
  confirmadoEn: z.date().nullable(),
});
export type RecordatorioSalidaDto = z.infer<typeof recordatorioSalidaDto>;
