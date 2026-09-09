import { z } from "zod";
import {
  TIPOS_RECOMENDACION,
  MODALIDADES_PLAN,
} from "@/dominio/entidades/PlanNutricional";

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
  horaDesde: hora
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  horaHasta: hora
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  opciones: z
    .array(opcionPlanDto)
    .min(1, "Cada comida necesita al menos una opción"),
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
  comidas: z.array(comidaPlanDto),
  equivalencias: z.array(equivalenciaPlanDto).max(100).optional(),
  recomendaciones: z.array(recomendacionPlanDto).max(100).optional(),
  /** APP (se carga acá) o PDF (el plan ES el archivo). Por defecto APP. */
  modalidad: z.enum(MODALIDADES_PLAN).optional(),
  /** Carpeta donde guardarlo. null = suelto. */
  grupoId: z.string().min(1).nullable().optional(),
  /** Archivos ya subidos (contexto "plan") que quedan vinculados al plan. */
  archivoIds: z.array(z.string().min(1)).max(20).optional(),
  /** Cuál de ellos ES el plan. Solo en modalidad PDF. */
  archivoPrincipalId: z.string().min(1).nullable().optional(),
  ...metas,
});

/**
 * El contenido que pide cada modalidad. La regla dura la aplica la entidad;
 * acá se repite para que el error salga marcado en el campo del formulario y
 * no como excepción.
 */
interface DatosConContenido {
  comidas: unknown[];
  modalidad?: (typeof MODALIDADES_PLAN)[number];
  archivoPrincipalId?: string | null;
}

/** Un plan de la app necesita al menos una comida. */
function contenidoDeLaApp(datos: DatosConContenido): boolean {
  return (datos.modalidad ?? "APP") !== "APP" || datos.comidas.length > 0;
}

/** Un plan en PDF necesita el archivo que ES el plan. */
function contenidoDelPdf(datos: DatosConContenido): boolean {
  return datos.modalidad !== "PDF" || Boolean(datos.archivoPrincipalId);
}

const FALTA_COMIDA = {
  message: "Agregá al menos una comida",
  path: ["comidas"],
};
const FALTA_ARCHIVO = {
  message: "Subí el archivo con el plan",
  path: ["archivoPrincipalId"],
};

// Los refines van encadenados en cada esquema y no en un helper genérico: un
// helper que reciba `ZodType<DatosConContenido>` le borra el tipo al resultado
// y `z.infer` deja de servir para tipar la entrada del router.
export const crearPlanDto = planBase
  .extend({ esPlantilla: z.boolean().optional() })
  .refine((d) => contenidoDeLaApp(d), FALTA_COMIDA)
  .refine((d) => contenidoDelPdf(d), FALTA_ARCHIVO);
export type CrearPlanDto = z.infer<typeof crearPlanDto>;

export const actualizarPlanDto = planBase
  .extend({ id: z.string().min(1) })
  .refine((d) => contenidoDeLaApp(d), FALTA_COMIDA)
  .refine((d) => contenidoDelPdf(d), FALTA_ARCHIVO);
export type ActualizarPlanDto = z.infer<typeof actualizarPlanDto>;

export const idPlanDto = z.object({ id: z.string().min(1) });
export type IdPlanDto = z.infer<typeof idPlanDto>;

export const filtroPlanesDto = z
  .object({
    esPlantilla: z.boolean().optional(),
    incluirArchivados: z.boolean().optional(),
    texto: z.string().max(160).optional(),
    grupoId: z.string().min(1).nullable().optional(),
  })
  .optional();
export type FiltroPlanesDto = z.infer<typeof filtroPlanesDto>;

/** Listado paginado de planes (10 por página por defecto). */
export const listarPlanesPaginadoDto = z.object({
  esPlantilla: z.boolean().optional(),
  incluirArchivados: z.boolean().optional(),
  texto: z.string().max(160).optional(),
  /** null filtra los SUELTOS; ausente no filtra por carpeta. */
  grupoId: z.string().min(1).nullable().optional(),
  pagina: z.number().int().positive().default(1),
  porPagina: z.number().int().positive().max(100).default(10),
});
export type ListarPlanesPaginadoDto = z.infer<typeof listarPlanesPaginadoDto>;

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

/** Ficha de un archivo del plan. Se abre por /api/archivos/<id>/ver. */
const archivoDelPlanDto = z.object({
  id: z.string(),
  nombreOriginal: z.string(),
  mimeType: z.string(),
  tamanoBytes: z.number(),
});
export type ArchivoDelPlanDto = z.infer<typeof archivoDelPlanDto>;

const opcionSalida = z.object({
  id: z.string(),
  numero: z.number(),
  contenido: z.string(),
  recetaId: z.string().nullable(),
  recetaNombre: z.string().nullable(),
  recetaMacros: z
    .object({
      calorias: z.number().nullable(),
      proteinasG: z.number().nullable(),
      carbohidratosG: z.number().nullable(),
      grasasG: z.number().nullable(),
    })
    .nullable(),
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
    z.object({
      id: z.string(),
      titulo: z.string(),
      detalle: z.string(),
      orden: z.number(),
    }),
  ),
  recomendaciones: z.array(
    z.object({
      id: z.string(),
      tipo: z.enum(TIPOS_RECOMENDACION),
      texto: z.string(),
      orden: z.number(),
    }),
  ),
  modalidad: z.enum(MODALIDADES_PLAN),
  grupoId: z.string().nullable(),
  /** Nombre de la carpeta, para mostrarlo sin una consulta aparte. */
  grupoNombre: z.string().nullable(),
  /**
   * El archivo que ES el plan (modalidad PDF), ya resuelto: la pantalla no
   * elige entre el elegido y el primero disponible, eso lo hace la entidad.
   * Null en modalidad APP.
   */
  archivoPrincipal: archivoDelPlanDto.nullable(),
  /** Archivos que acompañan al plan sin reemplazarlo. */
  adjuntos: z.array(archivoDelPlanDto),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type PlanSalidaDto = z.infer<typeof planSalidaDto>;

/** Resultado paginado del listado de planes. */
export interface PlanesPaginados {
  planes: PlanSalidaDto[];
  total: number;
  paginas: number;
}

// --- Asignaciones y carpetas -------------------------------------------------

/**
 * Una asignación del historial. `planId` en null significa que el plan se
 * borró: la asignación sobrevive porque qué siguió el paciente y entre qué
 * fechas es información suya, no del plan (ver migración 38).
 */
export const asignacionPlanSalidaDto = z.object({
  id: z.string(),
  planId: z.string().nullable(),
  /** Nombre del plan al asignarlo. Sobrevive al borrado y al renombre. */
  nombrePlan: z.string(),
  pacienteId: z.string(),
  fechaInicio: z.date(),
  /** Fin planificado al asignar. */
  fechaFin: z.date().nullable(),
  /** Fin real: cuándo dejó de regir. */
  finalizadaEn: z.date().nullable(),
  activa: z.boolean(),
});
export type AsignacionPlanSalidaDto = z.infer<typeof asignacionPlanSalidaDto>;

export const asignacionConPacienteDto = asignacionPlanSalidaDto.extend({
  pacienteNombre: z.string(),
  pacienteApellido: z.string(),
});
export type AsignacionConPacienteDto = z.infer<typeof asignacionConPacienteDto>;

export const grupoPlanDto = z.object({
  nombre: z.string().min(1, "La carpeta necesita un nombre").max(80),
  descripcion: z.string().max(500).optional().nullable(),
});
export type GrupoPlanDto = z.infer<typeof grupoPlanDto>;

export const actualizarGrupoPlanDto = grupoPlanDto.extend({
  id: z.string().min(1),
});
export type ActualizarGrupoPlanDto = z.infer<typeof actualizarGrupoPlanDto>;

export const idGrupoPlanDto = z.object({ id: z.string().min(1) });
export type IdGrupoPlanDto = z.infer<typeof idGrupoPlanDto>;

export const grupoPlanSalidaDto = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  /** Planes (no plantillas) adentro, archivados incluidos. */
  cantidadPlanes: z.number(),
  /** Plantillas adentro, archivadas incluidas. */
  cantidadPlantillas: z.number(),
  creadoEn: z.date(),
  actualizadoEn: z.date(),
});
export type GrupoPlanSalidaDto = z.infer<typeof grupoPlanSalidaDto>;

export const moverPlanDto = z.object({
  planId: z.string().min(1),
  /** null saca el plan de la carpeta en la que esté. */
  grupoId: z.string().min(1).nullable(),
});
export type MoverPlanDto = z.infer<typeof moverPlanDto>;
