import { z } from "zod";
import { MODALIDADES_PLAN } from "@/dominio/entidades/PlanNutricional";
import { numeroEnRango } from "@/lib/validacionListas";

/**
 * Esquema, tipos y constantes del formulario de plan.
 *
 * Se extraen del componente por dos razones. La primera es de tamaño: el
 * archivo pasaba las 900 líneas y esto era su primer sexto. La segunda importa
 * más — el esquema es la CONTRAPARTE de `crearPlanDto`, y tenerlo en su propio
 * módulo hace visible que son dos escrituras de la misma regla. La divergencia
 * entre ambos es lo que verifica `coherencia-formularios-2.test.ts`.
 */

/** Sentinela para "sin receta" (Radix Select no admite value=""). */
export const SIN_RECETA = "__ninguna__";
/** Ídem para "sin carpeta": estar suelto es una opción, no la ausencia de una. */
export const SIN_CARPETA = "__suelto__";

const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm")
  .or(z.literal(""));

/** Esquema del formulario de plan. Exportado para el test de coherencia. */
export const esquema = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio").max(160),
    descripcion: z.string().max(2000),
    esPlantilla: z.boolean(),
    // Los topes son los de planBase en el DTO: sin ellos, un dedazo (12000
    // kcal en vez de 1200) pasaba la pantalla y lo rechazaba el servidor.
    caloriasMeta: numeroEnRango(0, 100_000),
    proteinasMetaG: numeroEnRango(0, 10_000),
    carbohidratosMetaG: numeroEnRango(0, 10_000),
    grasasMetaG: numeroEnRango(0, 10_000),
    contactosUtiles: z.string().max(2000),
    comidas: z.array(
      z.object({
        nombre: z.string().min(1, "Nombre obligatorio").max(80),
        horaDesde: hora,
        horaHasta: hora,
        opciones: z
          .array(
            z.object({
              contenido: z
                .string()
                .min(1, "La opción no puede estar vacía")
                .max(2000),
              recetaId: z.string(),
            }),
          )
          .min(1),
      }),
    ),
    /** APP o PDF. Viene fijada por la pantalla que abrió el formulario. */
    modalidad: z.enum(MODALIDADES_PLAN),
    /** Carpeta donde guardarlo, o el sentinela SIN_CARPETA. */
    grupoId: z.string(),
    /** Id del Archivo que ES el plan (modalidad PDF), o null. */
    archivoPrincipalId: z.string().nullable(),
    equivalencias: z
      .array(
        z.object({
          titulo: z.string().min(1, "Título obligatorio").max(160),
          detalle: z.string().min(1, "Detalle obligatorio").max(1000),
        }),
      )
      .max(100, "Hasta 100 equivalencias"),
    recomendaciones: z
      .array(
        z.object({
          tipo: z.enum(["NUTRICIONAL", "SALUD"]),
          texto: z.string().min(1, "Texto obligatorio").max(1000),
        }),
      )
      .max(100, "Hasta 100 recomendaciones"),
  })
  // Cada modalidad pide su propio contenido. No es "una cosa o la otra" sobre
  // el mismo plan: son dos clases de plan, y el formulario ya sabe cuál está
  // editando.
  .superRefine((d, ctx) => {
    if (d.modalidad === "APP" && d.comidas.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Agregá al menos una comida",
        path: ["comidas"],
      });
    }
    if (d.modalidad === "PDF" && !d.archivoPrincipalId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Subí el archivo con el plan",
        path: ["archivoPrincipalId"],
      });
    }
  });
export type DatosFormulario = z.infer<typeof esquema>;

export const FRANJAS_INICIALES: DatosFormulario["comidas"] = [
  {
    nombre: "Desayuno",
    horaDesde: "08:00",
    horaHasta: "09:00",
    opciones: [{ contenido: "", recetaId: SIN_RECETA }],
  },
  {
    nombre: "Almuerzo",
    horaDesde: "12:30",
    horaHasta: "13:30",
    opciones: [{ contenido: "", recetaId: SIN_RECETA }],
  },
  {
    nombre: "Merienda",
    horaDesde: "17:00",
    horaHasta: "17:30",
    opciones: [{ contenido: "", recetaId: SIN_RECETA }],
  },
  {
    nombre: "Cena",
    horaDesde: "21:00",
    horaHasta: "22:00",
    opciones: [{ contenido: "", recetaId: SIN_RECETA }],
  },
];

export function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const numero = Number(valor.trim().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}
