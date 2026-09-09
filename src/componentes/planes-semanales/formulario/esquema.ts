import { z } from "zod";
import { DIAS_SEMANA } from "@/dominio/entidades/PlanSemanal";
import { numeroEnRango } from "@/lib/validacionListas";

/**
 * Esquema, tipos y constantes del formulario de plan semanal.
 *
 * Es la CONTRAPARTE de `crearPlanSemanalDto`: dos escrituras de la misma regla.
 * La direccional que hay que respetar es la de siempre —el formulario puede ser
 * más estricto que el servidor, nunca menos—, y lo verifica
 * `planes-semanales.coherencia.test.ts`.
 *
 * Los números van como texto porque los inputs pueden estar vacíos, igual que
 * en el formulario de receta.
 */

/** Sentinela para «sin receta» (Radix Select no admite value=""). */
export const SIN_RECETA = "__ninguna__";

const hora = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm")
  .or(z.literal(""));

const itemEsquema = z.object({
  nombre: z.string().min(1, "Nombre").max(160),
  cantidadGramos: numeroEnRango(0, 100_000),
  caloriasPor100: numeroEnRango(0, 10_000),
  proteinasPor100: numeroEnRango(0, 10_000),
  carbohidratosPor100: numeroEnRango(0, 10_000),
  grasasPor100: numeroEnRango(0, 10_000),
  fuente: z.string(),
  referenciaExterna: z.string(),
});
export type ItemFormulario = z.infer<typeof itemEsquema>;

const comidaEsquema = z.object({
  dia: z.enum(DIAS_SEMANA),
  descripcion: z.string().max(2000),
  /** Id de la receta vinculada, o SIN_RECETA. */
  recetaId: z.string(),
  /** Porciones de esa receta. Vacío = 1. */
  porciones: numeroEnRango(0.01, 100, "Entre 0,01 y 100 porciones"),
  items: z.array(itemEsquema).max(40, "Hasta 40 alimentos por comida"),
});
export type ComidaFormulario = z.infer<typeof comidaEsquema>;

const franjaEsquema = z.object({
  nombre: z.string().min(1, "Nombre obligatorio").max(80),
  horaDesde: hora,
  horaHasta: hora,
  comidas: z.array(comidaEsquema).max(70),
});

/** Esquema del formulario de plan semanal. Exportado para el test de coherencia. */
export const esquema = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio").max(160),
    descripcion: z.string().max(2000),
    franjas: z
      .array(franjaEsquema)
      .min(1, "Agregá al menos una franja")
      .max(12, "Hasta 12 franjas"),
  })
  // La misma regla que aplica la entidad: una grilla entera en blanco no es un
  // plan. Se repite acá para que salga como error del formulario y no como
  // excepción del servidor.
  .superRefine((datos, ctx) => {
    const cargadas = datos.franjas.some((franja) =>
      franja.comidas.some(tieneContenido),
    );
    if (!cargadas) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cargá al menos una comida en la semana",
        path: ["franjas"],
      });
    }
  });
export type DatosFormulario = z.infer<typeof esquema>;

/**
 * ¿Esta celda tiene algo cargado?
 *
 * Las celdas vacías no viajan al servidor —la entidad las descarta— pero la
 * grilla las tiene igual mientras se edita: son los huecos del menú.
 */
export function tieneContenido(comida: ComidaFormulario): boolean {
  return (
    comida.descripcion.trim().length > 0 ||
    comida.recetaId !== SIN_RECETA ||
    comida.items.some((item) => item.nombre.trim().length > 0)
  );
}

/** Las franjas de arranque: las seis que usa una semana típica. */
export const FRANJAS_INICIALES: DatosFormulario["franjas"] = [
  { nombre: "Desayuno", horaDesde: "08:00", horaHasta: "09:00", comidas: [] },
  { nombre: "Col. AM", horaDesde: "10:30", horaHasta: "11:00", comidas: [] },
  { nombre: "Almuerzo", horaDesde: "12:30", horaHasta: "13:30", comidas: [] },
  { nombre: "Col. PM", horaDesde: "16:00", horaHasta: "16:30", comidas: [] },
  { nombre: "Merienda", horaDesde: "17:30", horaHasta: "18:00", comidas: [] },
  { nombre: "Cena", horaDesde: "21:00", horaHasta: "22:00", comidas: [] },
];

/** Una comida en blanco para un día (la que abre el editor de una celda). */
export function comidaVacia(
  dia: DatosFormulario["franjas"][number]["comidas"][number]["dia"],
): ComidaFormulario {
  return {
    dia,
    descripcion: "",
    recetaId: SIN_RECETA,
    porciones: "",
    items: [],
  };
}

/** Un alimento en blanco, para cargarlo a mano. */
export function itemVacio(): ItemFormulario {
  return {
    nombre: "",
    cantidadGramos: "",
    caloriasPor100: "",
    proteinasPor100: "",
    carbohidratosPor100: "",
    grasasPor100: "",
    fuente: "MANUAL",
    referenciaExterna: "",
  };
}

export function aNumero(valor: string): number | null {
  if (valor.trim() === "") return null;
  const numero = Number(valor.trim().replace(",", "."));
  return Number.isFinite(numero) ? numero : null;
}
