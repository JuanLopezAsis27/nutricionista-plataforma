import { describe, it, expect } from "vitest";
import {
  CLAVES_PROMPT_IA,
  PROMPTS_IA,
  PromptsIAPorDefecto,
  aplicarVariables,
  promptPorDefecto,
} from "./promptsIA";

/** Los `{{marcadores}}` que aparecen escritos en un texto. */
function marcadoresDe(texto: string): string[] {
  return [...texto.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g)].map(
    (coincidencia) => coincidencia[1] ?? "",
  );
}

describe("catálogo de prompts de IA", () => {
  it("tiene una entrada por clave, sin faltantes ni de más", () => {
    expect(PROMPTS_IA.map((p) => p.clave)).toEqual([...CLAVES_PROMPT_IA]);
  });

  /**
   * Las dos direcciones del mismo error, y las dos ya pasaron al escribir esto:
   * un marcador en el texto que la app nunca completa queda como `{{hoy}}`
   * literal en el prompt que ve el modelo, y una variable declarada que el
   * texto no usa es un dato que se arma y se tira.
   */
  it("declara exactamente los marcadores que usa cada texto", () => {
    for (const prompt of PROMPTS_IA) {
      const enElTexto = new Set(marcadoresDe(prompt.porDefecto));
      const declaradas = new Set(prompt.variables.map((v) => v.nombre));
      expect([...enElTexto].sort(), `texto de ${prompt.clave}`).toEqual(
        [...declaradas].sort(),
      );
    }
  });

  it("explica cada funcionalidad con algo más que un título", () => {
    for (const prompt of PROMPTS_IA) {
      expect(prompt.titulo.length, prompt.clave).toBeGreaterThan(0);
      expect(prompt.donde.length, prompt.clave).toBeGreaterThan(0);
      expect(prompt.audiencia.length, prompt.clave).toBeGreaterThan(0);
      expect(prompt.descripcion.length, prompt.clave).toBeGreaterThan(120);
      expect(prompt.porDefecto.trim().length, prompt.clave).toBeGreaterThan(20);
    }
  });
});

describe("aplicarVariables", () => {
  it("reemplaza los marcadores conocidos", () => {
    expect(aplicarVariables("Hoy es {{hoy}}.", { hoy: "2026-09-13" })).toBe(
      "Hoy es 2026-09-13.",
    );
  });

  it("tolera espacios adentro de las llaves", () => {
    expect(aplicarVariables("{{ hoy }}", { hoy: "2026-09-13" })).toBe(
      "2026-09-13",
    );
  });

  /**
   * Un marcador mal escrito por el profesional se deja a la vista en vez de
   * vaciarse: verlo en el prompt es lo que le dice dónde está el error.
   */
  it("deja tal cual un marcador que no conoce", () => {
    expect(aplicarVariables("Hola {{pasiente}}", { paciente: "Ana" })).toBe(
      "Hola {{pasiente}}",
    );
  });

  it("reemplaza todas las apariciones del mismo marcador", () => {
    expect(aplicarVariables("{{x}} y {{x}}", { x: "a" })).toBe("a y a");
  });

  it("no reinterpreta los marcadores que aparezcan en el valor", () => {
    expect(aplicarVariables("{{a}}", { a: "{{b}}", b: "roto" })).toBe("{{b}}");
  });
});

describe("PromptsIAPorDefecto", () => {
  it("devuelve el texto de fábrica con las variables ya reemplazadas", async () => {
    const texto = await new PromptsIAPorDefecto().obtener("MEDICIONES", {
      hoy: "2026-09-13",
      medidas: "pesoKg (peso)",
    });

    expect(texto).toContain("Hoy es 2026-09-13.");
    expect(texto).toContain("pesoKg (peso)");
    expect(marcadoresDe(texto)).toEqual([]);
  });

  it("sin variables deja el texto de fábrica intacto", async () => {
    const texto = await new PromptsIAPorDefecto().obtener("RESUMEN_CONSULTA");
    expect(texto).toBe(promptPorDefecto("RESUMEN_CONSULTA"));
  });
});
