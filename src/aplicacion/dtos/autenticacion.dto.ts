import { z } from "zod";
import { passwordNuevaDto } from "./password";

/**
 * DTOs de autenticación — recuperación de contraseña.
 *
 * Son endpoints PÚBLICOS (sin sesión): validan la forma de la entrada en el
 * borde. La longitud mínima de la contraseña coincide con el alta de paciente.
 */

export const solicitarRecuperacionDto = z.object({
  email: z.string().email("Email inválido"),
});
export type SolicitarRecuperacionDto = z.infer<typeof solicitarRecuperacionDto>;

export const restablecerPasswordDto = z.object({
  token: z.string().min(1, "Falta el token de recuperación."),
  // La MISMA política que al crear la cuenta (ver dtos/password.ts). Antes
  // este mínimo era 6 y el del alta 8, así que "olvidé mi contraseña" servía
  // para rebajar la política por la puerta de atrás.
  password: passwordNuevaDto,
});
export type RestablecerPasswordDto = z.infer<typeof restablecerPasswordDto>;

/** El token del enlace, para saber si sirve antes de mostrar el formulario. */
export const verificarTokenRecuperacionDto = z.object({
  token: z.string().min(1).max(500),
});

/**
 * Elegir el consultorio en el que trabaja el paciente (migración 78). Viaja
 * la ficha elegida; que sea de un acceso de la cuenta lo revalida
 * `CambiarConsultorioActivo`.
 */
export const cambiarConsultorioDto = z.object({
  pacienteId: z.string().min(1).max(100),
});
export type CambiarConsultorioDto = z.infer<typeof cambiarConsultorioDto>;

/** Un consultorio de la cuenta, para elegir en cuál trabajar. */
export interface ConsultorioSalidaDto {
  pacienteId: string;
  nutricionistaId: string;
  nombreProfesional: string;
  fotoProfesionalId: string | null;
  /** El de la sesión en curso. */
  activo: boolean;
}
