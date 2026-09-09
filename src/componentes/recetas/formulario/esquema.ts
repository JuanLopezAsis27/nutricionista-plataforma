import { z } from "zod";
import {
  etiquetasEnTexto,
  enlacesEnTexto,
  numeroEnRango,
} from "@/lib/validacionListas";

/**
 * Esquema y tipos del formulario de receta.
 *
 * Es la contraparte de `crearRecetaDto`: dos escrituras de la misma regla, y
 * tenerlo en su propio módulo hace visible ese pareo. Que no diverjan lo
 * verifica `coherencia-formularios-2.test.ts` — ahí aparecieron cuatro
 * divergencias reales, entre ellas los enlaces sin validar como URL.
 */

const numeroOpcional = z
  .string()
  .refine(
    (v) => v === "" || Number(v.replace(",", ".")) >= 0,
    "Debe ser un número positivo",
  );

const ingredienteEsquema = z.object({
  nombre: z.string().min(1, "Nombre").max(200),
  cantidadGramos: numeroOpcional,
  caloriasPor100: numeroOpcional,
  proteinasPor100: numeroOpcional,
  carbohidratosPor100: numeroOpcional,
  grasasPor100: numeroOpcional,
  fuente: z.string(),
  referenciaExterna: z.string(),
});

/**
 * Esquema del formulario de receta. Exportado para verificar en un test que no
 * diverge de `crearRecetaDto`.
 *
 * Los límites por elemento de `etiquetas` y `enlaces` no estaban: el formulario
 * solo miraba el largo total del textarea y el servidor validaba cada ítem. El
 * caso que se colaba todos los días era pegar `google.com` sin protocolo —el
 * formulario lo aceptaba y la mutación lo rechazaba con "Debe ser una URL
 * válida"—.
 */
export const esquema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(160),
  descripcion: z.string().max(1000),
  // El DTO acepta enteros de 1 a 100: "0 porciones" no es una receta.
  porciones: numeroOpcional.refine((v) => {
    if (v === "") return true;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) && n >= 1 && n <= 100;
  }, "Entre 1 y 100 porciones"),
  ingredientes: z.array(ingredienteEsquema).max(100),
  preparacion: z.string().max(5000),
  etiquetas: etiquetasEnTexto(500),
  enlaces: enlacesEnTexto(5000),
  calorias: numeroEnRango(0, 100_000),
  proteinasG: numeroEnRango(0, 10_000),
  carbohidratosG: numeroEnRango(0, 10_000),
  grasasG: numeroEnRango(0, 10_000),
});
export type DatosFormulario = z.infer<typeof esquema>;
export type IngredienteFormulario = DatosFormulario["ingredientes"][number];

export const INGREDIENTE_VACIO: IngredienteFormulario = {
  nombre: "",
  cantidadGramos: "",
  caloriasPor100: "",
  proteinasPor100: "",
  carbohidratosPor100: "",
  grasasPor100: "",
  fuente: "MANUAL",
  referenciaExterna: "",
};
