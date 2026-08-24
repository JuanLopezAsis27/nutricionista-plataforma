import { z } from "zod";

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
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(72, "La contraseña es demasiado larga"),
});
export type RestablecerPasswordDto = z.infer<typeof restablecerPasswordDto>;
