import { z } from "zod";
import { TIPOS_COMIDA } from "@/dominio/entidades/Dieta";

/** DTOs de Dieta — esquemas Zod de entrada/salida. */

export const comidaDto = z.object({
  tipo: z.enum(TIPOS_COMIDA),
  descripcion: z.string().min(1, "La descripción es obligatoria").max(500),
  calorias: z.number().int().min(0).optional().nullable(),
});
export type ComidaDto = z.infer<typeof comidaDto>;

export const crearDietaDto = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(120),
  descripcion: z.string().max(1000).optional().nullable(),
  comidas: z.array(comidaDto).min(1, "La dieta debe tener al menos una comida"),
});
export type CrearDietaDto = z.infer<typeof crearDietaDto>;

export const actualizarDietaDto = crearDietaDto.extend({
  id: z.string().min(1),
});
export type ActualizarDietaDto = z.infer<typeof actualizarDietaDto>;

export const asignarDietaDto = z
  .object({
    dietaId: z.string().min(1),
    pacienteId: z.string().min(1),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date().optional().nullable(),
  })
  .refine(
    (datos) => !datos.fechaFin || datos.fechaFin >= datos.fechaInicio,
    { message: "La fecha de fin no puede ser anterior a la de inicio", path: ["fechaFin"] },
  );
export type AsignarDietaDto = z.infer<typeof asignarDietaDto>;

export const idDietaDto = z.object({ id: z.string().min(1) });
export type IdDietaDto = z.infer<typeof idDietaDto>;

export const comidaSalidaDto = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_COMIDA),
  descripcion: z.string(),
  calorias: z.number().nullable(),
});

export const dietaSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  comidas: z.array(comidaSalidaDto),
  creadoEn: z.date(),
});
export type DietaSalidaDto = z.infer<typeof dietaSalidaDto>;
