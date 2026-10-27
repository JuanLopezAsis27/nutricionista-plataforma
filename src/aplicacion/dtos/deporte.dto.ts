import { z } from "zod";
import { LARGO_MAXIMO_NOMBRE_DEPORTE } from "@/dominio/entidades/Deporte";
import { FORMATOS_PLANIFICACION } from "@/dominio/entidades/PlanificacionDeportiva";

/** DTOs de la lista de deportes de la plataforma (migración 97). */

export const idDeporteDto = z.string().min(1).max(64);

export const crearDeporteDto = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "Indicá el nombre")
    .max(LARGO_MAXIMO_NOMBRE_DEPORTE),
});
export type CrearDeporteDto = z.infer<typeof crearDeporteDto>;

export const renombrarDeporteDto = crearDeporteDto.extend({
  id: idDeporteDto,
});
export type RenombrarDeporteDto = z.infer<typeof renombrarDeporteDto>;

export const eliminarDeporteDto = z.object({ id: idDeporteDto });

/** Qué planificación le corresponde (migración 98); null = ninguna todavía. */
export const cambiarPlanificacionDeporteDto = z.object({
  id: idDeporteDto,
  formatoPlanificacion: z.enum(FORMATOS_PLANIFICACION).nullable(),
});

/** Un deporte tal como lo ve la pantalla, y como viaja dentro de un perfil. */
export const deporteSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  formatoPlanificacion: z.enum(FORMATOS_PLANIFICACION).nullable(),
});
export type DeporteSalidaDto = z.infer<typeof deporteSalidaDto>;
