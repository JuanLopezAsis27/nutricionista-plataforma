import { describe, it, expect } from "vitest";
import { z } from "zod";
import { mensajeDesdeZod } from "./mensajeZod";

/**
 * El caso que originó el módulo: importar mediciones desde una planilla.
 *
 * Once consultas con el mismo perímetro mal leído producían once issues de
 * Zod, y el `message` del TRPCError era el JSON de los once. El profesional
 * recibía un toast de ochenta líneas que no nombraba ni una sola vez la medida
 * que tenía que corregir.
 */
const medicion = z.object({
  pesoKg: z.number().min(20).max(400),
  circPantorrilla: z.number().min(20).max(250).optional(),
});
const lote = z.object({ mediciones: z.array(medicion).min(1) });

/** El ZodError de parsear `valor` con `esquema` (que tiene que fallar). */
function errorDe(esquema: z.ZodTypeAny, valor: unknown): z.ZodError {
  const resultado = esquema.safeParse(valor);
  if (resultado.success) throw new Error("se esperaba que fallara");
  return resultado.error;
}

describe("mensajeDesdeZod", () => {
  it("nombra la medida como se la ve en pantalla, no como se llama el campo", () => {
    const error = errorDe(lote, {
      mediciones: [{ pesoKg: 64, circPantorrilla: 2 }],
    });

    const mensaje = mensajeDesdeZod(error);
    expect(mensaje).toContain("Perímetro de pantorrilla");
    expect(mensaje).toContain("20 o más");
    expect(mensaje).not.toContain("circPantorrilla");
  });

  it("agrupa el mismo problema repetido en el lote y lo cuenta", () => {
    const error = errorDe(lote, {
      mediciones: Array.from({ length: 11 }, () => ({
        pesoKg: 64,
        circPantorrilla: 2,
      })),
    });

    const mensaje = mensajeDesdeZod(error);
    // Un problema repetido once veces es UNA frase, no once.
    expect(mensaje).toContain("en 11 mediciones");
    expect(mensaje.match(/Perímetro de pantorrilla/g)).toHaveLength(1);
  });

  it("nunca devuelve el volcado de los issues", () => {
    const error = errorDe(lote, {
      mediciones: [{ pesoKg: 1, circPantorrilla: 2 }],
    });

    const mensaje = mensajeDesdeZod(error);
    expect(mensaje).not.toContain("too_small");
    expect(mensaje).not.toContain('"path"');
    expect(mensaje.length).toBeLessThan(300);
  });

  it("corta en tres campos y cuenta el resto", () => {
    const esquema = z.object({
      a: z.number().min(1),
      b: z.number().min(1),
      c: z.number().min(1),
      d: z.number().min(1),
      e: z.number().min(1),
    });
    const mensaje = mensajeDesdeZod(
      errorDe(esquema, { a: 0, b: 0, c: 0, d: 0, e: 0 }),
    );

    expect(mensaje).toContain("Hay 5 datos para revisar");
    expect(mensaje).toContain("Y 2 más.");
  });

  it("respeta el mensaje que escribimos nosotros en el DTO", () => {
    const esquema = z.object({
      mediciones: z.array(z.number()).min(1, "No hay mediciones para importar"),
    });

    expect(mensajeDesdeZod(errorDe(esquema, { mediciones: [] }))).toContain(
      "No hay mediciones para importar",
    );
  });

  it("un campo obligatorio que falta se dice como tal", () => {
    const esquema = z.object({ pacienteId: z.string().min(1) });

    expect(mensajeDesdeZod(errorDe(esquema, {}))).toContain(
      "no puede quedar vacío",
    );
  });
});
