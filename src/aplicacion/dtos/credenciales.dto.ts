import { z } from "zod";
import { INTEGRACIONES_CREDENCIALES } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";

/** DTOs de las credenciales de integración del profesional. */

/** Criterios de ingredientes: filtran los alimentos que trae la búsqueda. */
export const criteriosIngredientesDto = z.object({
  excluirMarcas: z.boolean(),
  requiereMacros: z.boolean(),
  maxCaloriasPor100: z.number().min(0).max(2000).nullable(),
  excluirTexto: z.array(z.string().max(60)).max(20),
});
export type CriteriosIngredientesDto = z.infer<typeof criteriosIngredientesDto>;

/**
 * Guardar credenciales. Cada campo es opcional: si no se envía, se deja como
 * está; string vacío la borra; un valor la setea (los secretos se cifran).
 *
 * Las claves de IA y de voz a texto ya no están: desde la migración 71 las
 * carga el SUPERADMIN para toda la plataforma (`iaPlataforma.dto.ts`).
 */
export const guardarCredencialesDto = z.object({
  // WhatsApp Cloud API (Meta).
  whatsappToken: z.string().max(500).optional(),
  whatsappPhoneNumberId: z.string().max(60).optional(),
  whatsappVerifyToken: z.string().max(200).optional(),
  whatsappAppSecret: z.string().max(200).optional(),
  whatsappWabaId: z.string().max(60).optional(),
  criterios: criteriosIngredientesDto.optional(),
});
export type GuardarCredencialesDto = z.infer<typeof guardarCredencialesDto>;

/**
 * Dar de baja una integración entera.
 *
 * Es una operación aparte de `guardar` con cadenas vacías y no azúcar sobre
 * ella: borrar TODO lo de una integración es una intención distinta de
 * "cambiá este campo", y cada pantalla que lo resolvía enumerando a mano los
 * campos que hay que vaciar se olvidaba de alguno —WhatsApp no tenía forma de
 * borrarse, y la clave de IA solo se borraba la del proveedor seleccionado—.
 */
export const eliminarCredencialesDto = z.object({
  integracion: z.enum(INTEGRACIONES_CREDENCIALES),
});
export type EliminarCredencialesDto = z.infer<typeof eliminarCredencialesDto>;

/** Estado (nunca devuelve los secretos, solo si están configurados). */
export const estadoCredencialesDto = z.object({
  /**
   * Si la plataforma tiene IA y voz a texto. Es solo lectura: el consultorio
   * no puede cambiarlo, pero tiene que saber por qué el asistente no contesta.
   */
  iaDisponible: z.boolean(),
  transcripcionDisponible: z.boolean(),
  /** true = el inquilino puede enviar y recibir por la API oficial. */
  whatsappConfigurado: z.boolean(),
  /** El phone_number_id no es secreto: se muestra para verificar el alta en Meta. */
  whatsappPhoneNumberId: z.string().nullable(),
  whatsappWebhookListo: z.boolean(),
  /** El id de la cuenta de WhatsApp Business tampoco es secreto. */
  whatsappWabaId: z.string().nullable(),
  /** true = se pueden crear plantillas desde la app (token + id de la cuenta). */
  whatsappPlantillasListas: z.boolean(),
  criterios: criteriosIngredientesDto,
});
export type EstadoCredencialesDto = z.infer<typeof estadoCredencialesDto>;
