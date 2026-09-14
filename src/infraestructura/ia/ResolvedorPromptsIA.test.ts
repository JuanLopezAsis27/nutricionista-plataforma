import { describe, it, expect, vi } from "vitest";
import type { IPromptIARepositorio } from "@/dominio/repositorios/IPromptIARepositorio";
import { promptPorDefecto } from "@/dominio/servicios/promptsIA";
import { ResolvedorPromptsIA } from "./ResolvedorPromptsIA";

function repositorio(
  propios: Partial<Record<string, string>>,
): IPromptIARepositorio {
  return {
    obtenerTodos: vi.fn().mockResolvedValue(propios),
    guardar: vi.fn(),
    restablecer: vi.fn(),
  };
}

describe("ResolvedorPromptsIA", () => {
  it("usa el texto del consultorio cuando lo hay", async () => {
    const resolvedor = new ResolvedorPromptsIA(
      repositorio({ RESUMEN_CONSULTA: "Resumí en tres viñetas." }),
    );

    await expect(resolvedor.obtener("RESUMEN_CONSULTA")).resolves.toBe(
      "Resumí en tres viñetas.",
    );
  });

  it("cae al de fábrica cuando esa funcionalidad no se personalizó", async () => {
    const resolvedor = new ResolvedorPromptsIA(
      repositorio({ RESUMEN_CONSULTA: "Resumí en tres viñetas." }),
    );

    await expect(resolvedor.obtener("ANALISIS_COMIDA")).resolves.toBe(
      promptPorDefecto("ANALISIS_COMIDA"),
    );
  });

  it("reemplaza las variables también en el texto propio", async () => {
    const resolvedor = new ResolvedorPromptsIA(
      repositorio({ MEDICIONES: "Hoy es {{hoy}}. Medidas: {{medidas}}." }),
    );

    await expect(
      resolvedor.obtener("MEDICIONES", {
        hoy: "2026-09-13",
        medidas: "pesoKg",
      }),
    ).resolves.toBe("Hoy es 2026-09-13. Medidas: pesoKg.");
  });

  it("un texto propio en blanco no deja a la IA sin instrucciones", async () => {
    const resolvedor = new ResolvedorPromptsIA(
      repositorio({ MEDICIONES: "  " }),
    );

    await expect(
      resolvedor.obtener("MEDICIONES", { hoy: "x" }),
    ).resolves.toContain("Sos el asistente de un consultorio de nutrición.");
  });

  /**
   * Sin alcance de inquilino —un trabajo del worker— la lectura lanza. Que no
   * se pueda leer la personalización no es motivo para dejar al paciente sin
   * respuesta: se sigue con el texto de fábrica.
   */
  it("degrada al de fábrica si la lectura falla", async () => {
    const roto: IPromptIARepositorio = {
      obtenerTodos: vi.fn().mockRejectedValue(new Error("sin inquilino")),
      guardar: vi.fn(),
      restablecer: vi.fn(),
    };

    await expect(
      new ResolvedorPromptsIA(roto).obtener("ANALISIS_COMIDA"),
    ).resolves.toBe(promptPorDefecto("ANALISIS_COMIDA"));
  });
});
