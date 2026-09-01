import { z } from "zod";
import { INTEGRACIONES_CREDENCIALES } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";

/** DTOs de las credenciales de integración del profesional. */

/**
 * Guardar credenciales. Cada campo es opcional: si no se envía, se deja como
 * está; string vacío la borra; un valor la setea (los secretos se cifran).
 */
export const PROVEEDORES_IA = ["ANTHROPIC", "OPENROUTER"] as const;

/**
 * Proveedores de voz a texto. Anthropic no está porque no transcribe audio:
 * es la razón por la que esta elección existe aparte de `PROVEEDORES_IA`.
 */
export const PROVEEDORES_TRANSCRIPCION = ["OPENAI", "OPENROUTER"] as const;

/** Criterios de ingredientes: filtran los alimentos que trae la búsqueda. */
export const criteriosIngredientesDto = z.object({
  excluirMarcas: z.boolean(),
  requiereMacros: z.boolean(),
  maxCaloriasPor100: z.number().min(0).max(2000).nullable(),
  excluirTexto: z.array(z.string().max(60)).max(20),
});
export type CriteriosIngredientesDto = z.infer<typeof criteriosIngredientesDto>;

export const guardarCredencialesDto = z.object({
  proveedorIA: z.enum(PROVEEDORES_IA).optional(),
  anthropicApiKey: z.string().max(300).optional(),
  anthropicModelo: z.string().max(120).optional(),
  fatsecretClientId: z.string().max(300).optional(),
  fatsecretClientSecret: z.string().max(300).optional(),
  // WhatsApp Cloud API (Meta).
  whatsappToken: z.string().max(500).optional(),
  whatsappPhoneNumberId: z.string().max(60).optional(),
  whatsappVerifyToken: z.string().max(200).optional(),
  whatsappAppSecret: z.string().max(200).optional(),
  // Voz a texto de las grabaciones de consulta.
  proveedorTranscripcion: z.enum(PROVEEDORES_TRANSCRIPCION).optional(),
  transcripcionApiKey: z.string().max(300).optional(),
  transcripcionModelo: z.string().max(120).optional(),
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
  proveedorIA: z.enum(PROVEEDORES_IA),
  anthropicConfigurado: z.boolean(),
  anthropicModelo: z.string().nullable(),
  fatsecretConfigurado: z.boolean(),
  /** true = el inquilino puede enviar y recibir por la API oficial. */
  whatsappConfigurado: z.boolean(),
  /** El phone_number_id no es secreto: se muestra para verificar el alta en Meta. */
  whatsappPhoneNumberId: z.string().nullable(),
  whatsappWebhookListo: z.boolean(),
  proveedorTranscripcion: z.enum(PROVEEDORES_TRANSCRIPCION),
  transcripcionConfigurada: z.boolean(),
  transcripcionModelo: z.string().nullable(),
  criterios: criteriosIngredientesDto,
});
export type EstadoCredencialesDto = z.infer<typeof estadoCredencialesDto>;
