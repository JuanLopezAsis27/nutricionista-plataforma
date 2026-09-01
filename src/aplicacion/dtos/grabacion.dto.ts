import { z } from "zod";
import { ESTADOS_GRABACION } from "@/dominio/entidades/GrabacionConsulta";

/** DTOs de las grabaciones de consulta. */

export const registrarGrabacionDto = z.object({
  turnoId: z.string().min(1),
  /** Audio ya subido por `/api/archivos` con contexto `grabacion`. */
  archivoId: z.string().min(1),
  /**
   * Duración medida por el navegador. Es informativa: el servidor no la puede
   * verificar sin decodificar el audio, y sirve para que la lista diga «12:34»
   * sin bajarse el archivo.
   */
  duracionSegundos: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 12)
    .nullable()
    .optional(),
});
export type RegistrarGrabacionDto = z.infer<typeof registrarGrabacionDto>;

export const idGrabacionDto = z.object({ id: z.string().min(1) });
export type IdGrabacionDto = z.infer<typeof idGrabacionDto>;

export const turnoGrabadoDto = z.object({ turnoId: z.string().min(1) });
export type TurnoGrabadoDto = z.infer<typeof turnoGrabadoDto>;

export const grabacionSalidaDto = z.object({
  id: z.string(),
  turnoId: z.string(),
  orden: z.number(),
  duracionSegundos: z.number().nullable(),
  estado: z.enum(ESTADOS_GRABACION),
  /**
   * El texto completo viaja a la pantalla: es la FUENTE del resumen y el
   * profesional tiene que poder contrastarlo. Recortarlo acá lo volvería
   * inauditable justo donde se lo lee.
   */
  transcripcion: z.string().nullable(),
  error: z.string().nullable(),
  intentos: z.number(),
  transcritoEn: z.date().nullable(),
  creadoEn: z.date(),
  /** Id del archivo de audio, para reproducirlo por `/api/archivos/<id>/ver`. */
  archivoId: z.string().nullable(),
  nombreArchivo: z.string().nullable(),
  mimeType: z.string().nullable(),
  tamanoBytes: z.number().nullable(),
});
export type GrabacionSalidaDto = z.infer<typeof grabacionSalidaDto>;

export const resumenConsultaSalidaDto = z.object({
  texto: z.string(),
  modelo: z.string().nullable(),
  grabacionesIncluidas: z.number(),
  generadoEn: z.date(),
});
export type ResumenConsultaSalidaDto = z.infer<typeof resumenConsultaSalidaDto>;

export const consultaGrabadaDto = z.object({
  grabaciones: z.array(grabacionSalidaDto),
  resumen: resumenConsultaSalidaDto.nullable(),
  /** El resumen no cubre todas las transcripciones listas. */
  resumenDesactualizado: z.boolean(),
  /**
   * Si hay un proveedor de voz a texto configurado. Sin esto, la pantalla no
   * puede distinguir «se está transcribiendo» de «nunca se va a transcribir
   * porque falta la clave», y el profesional espera para siempre.
   */
  transcripcionActiva: z.boolean(),
});
export type ConsultaGrabadaDto = z.infer<typeof consultaGrabadaDto>;
