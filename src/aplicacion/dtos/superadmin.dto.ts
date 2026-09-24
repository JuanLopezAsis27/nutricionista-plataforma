import { z } from "zod";
import { passwordNuevaDto } from "./password";
import { LARGO_MAXIMO_NOMBRE_PROFESIONAL } from "@/dominio/entidades/nombreProfesional";

/** DTOs del SuperAdmin (gestión de cuentas de nutricionista). */

export const crearCuentaNutricionistaDto = z.object({
  // Cómo firma el profesional (`nutricionistas.nombre`); lo puede cambiar.
  nombre: z
    .string()
    .trim()
    .min(1, "Ingresá el nombre del nutricionista")
    .max(LARGO_MAXIMO_NOMBRE_PROFESIONAL),
  email: z.string().email("Email inválido"),
  // Política única para toda la app (ver dtos/password.ts).
  password: passwordNuevaDto,
});
export type CrearCuentaNutricionistaDto = z.infer<
  typeof crearCuentaNutricionistaDto
>;

export const cambiarEstadoNutricionistaDto = z.object({
  id: z.string().min(1),
  activo: z.boolean(),
});
export type CambiarEstadoNutricionistaDto = z.infer<
  typeof cambiarEstadoNutricionistaDto
>;

export const nutricionistaSalidaDto = z.object({
  id: z.string(),
  email: z.string(),
  activo: z.boolean(),
  creadoEn: z.date(),
});
export type NutricionistaSalidaDto = z.infer<typeof nutricionistaSalidaDto>;
