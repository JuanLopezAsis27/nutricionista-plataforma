import { z } from "zod";
import { TIPOS_RECOMENDACION } from "@/dominio/entidades/PlanNutricional";

/** DTOs de Plan Nutricional — esquemas Zod de entrada/salida. */

const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener formato HH:mm");

export const opcionPlanDto = z.object({
  contenido: z.string().min(1, "La opción no puede estar vacía").max(2000),
  recetaId: z.string().min(1).optional().nullable(),
});

export const comidaPlanDto = z.object({
  nombre: z.string().min(1, "La comida debe tener un nombre").max(80),
  horaDesde: hora.optional().nullable().or(z.literal("").transform(() => null)),
  horaHasta: hora.optional().nullable().or(z.literal("").transform(() => null)),
  opciones: z.array(opcionPlanDto).min(1, "Cada comida necesita al menos una opción"),
});

export const equivalenciaPlanDto = z.object({
  titulo: z.string().min(1).max(160),
  detalle: z.string().min(1).max(1000),
});

export const recomendacionPlanDto = z.object({
  tipo: z.enum(TIPOS_RECOMENDACION),
  texto: z.string().min(1).max(1000),
});

const metas = {
  caloriasMeta: z.number().int().min(0).max(100000).optional().nullable(),
  proteinasMetaG: z.number().min(0).max(10000).optional().nullable(),
  carbohidratosMetaG: z.number().min(0).max(10000).optional().nullable(),
  grasasMetaG: z.number().min(0).max(10000).optional().nullable(),
};

const planBase = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(2000).optional().nullable(),
  contactosUtiles: z.string().max(2000).optional().nullable(),
  comidas: z.array(comidaPlanDto).min(1, "El plan debe tener al menos una comida"),
  equivalencias: z.array(equivalenciaPlanDto).max(100).optional(),
  recomendaciones: z.array(recomendacionPlanDto).max(100).optional(),
  ...metas,
});

export const crearPlanDto = planBase.extend({
  esPlantilla: z.boolean().optional(),
});
export type CrearPlanDto = z.infer<typeof crearPlanDto>;

export const actualizarPlanDto = planBase.extend({
  id: z.string().min(1),
});
export type ActualizarPlanDto = z.infer<typeof actualizarPlanDto>;

export const idPlanDto = z.object({ id: z.string().min(1) });
export type IdPlanDto = z.infer<typeof idPlanDto>;

export const filtroPlanesDto = z
  .object({
    esPlantilla: z.boolean().optional(),
    incluirArchivados: z.boolean().optional(),
    texto: z.string().max(160).optional(),
  })
  .optional();
export type FiltroPlanesDto = z.infer<typeof filtroPlanesDto>;

export const archivarPlanDto = z.object({
  id: z.string().min(1),
  archivado: z.boolean(),
});
export type ArchivarPlanDto = z.infer<typeof archivarPlanDto>;

export const crearDesdePlantillaDto = z.object({
  planOrigenId: z.string().min(1),
  nombre: z.string().max(160).optional().nullable(),
  esPlantilla: z.boolean().optional(),
});
export type CrearDesdePlantillaDto = z.infer<typeof crearDesdePlantillaDto>;

export const asignarPlanDto = z
  .object({
    planId: z.string().min(1),
    pacienteId: z.string().min(1),
    fechaInicio: z.coerce.date(),
    fechaFin: z.coerce.date().optional().nullable(),
  })
  .refine((datos) => !datos.fechaFin || datos.fechaFin >= datos.fechaInicio, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["fechaFin"],
  });
export type AsignarPlanDto = z.infer<typeof asignarPlanDto>;

// --- Salida ------------------------------------------------------------------

const opcionSalida = z.object({
  id: z.string(),
  numero: z.number(),
  contenido: z.string(),
  recetaId: z.string().nullable(),
  recetaNombre: z.string().nullable(),
  orden: z.number(),
});

const comidaSalida = z.object({
  id: z.string(),
  nombre: z.string(),
  horaDesde: z.string().nullable(),
  horaHasta: z.string().nullable(),
  orden: z.number(),
  opciones: z.array(opcionSalida),
});

export const planSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  esPlantilla: z.boolean(),
  planOrigenId: z.string().nullable(),
  archivado: z.boolean(),
  caloriasMeta: z.number().nullable(),
  proteinasMetaG: z.number().nullable(),
  carbohidratosMetaG: z.number().nullable(),
  grasasMetaG: z.number().nullable(),
  contactosUtiles: z.string().nullable(),
  comidas: z.array(comidaSalida),
  equivalencias: z.array(
    z.object({ id: z.string(), titulo: z.string(), detalle: z.string(), orden: z.number() }),
  ),
  recomendaciones: z.array(
    z.object({
      id: z.string(),
      tipo: z.enum(TIPOS_RECOMENDACION),
      texto: z.string(),
      orden: z.number(),
    }),
  ),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type PlanSalidaDto = z.infer<typeof planSalidaDto>;
