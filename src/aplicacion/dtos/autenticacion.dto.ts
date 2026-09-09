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
