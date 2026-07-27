import { z } from "zod";

/** DTOs del SuperAdmin (gestión de cuentas de nutricionista). */

export const crearCuentaNutricionistaDto = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
});
export type CrearCuentaNutricionistaDto = z.infer<typeof crearCuentaNutricionistaDto>;

export const cambiarEstadoNutricionistaDto = z.object({
  id: z.string().min(1),
  activo: z.boolean(),
});
export type CambiarEstadoNutricionistaDto = z.infer<typeof cambiarEstadoNutricionistaDto>;

export const nutricionistaSalidaDto = z.object({
  id: z.string(),
  email: z.string(),
  activo: z.boolean(),
  creadoEn: z.date(),
});
export type NutricionistaSalidaDto = z.infer<typeof nutricionistaSalidaDto>;
