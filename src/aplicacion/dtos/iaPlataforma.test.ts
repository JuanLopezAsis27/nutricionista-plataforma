import { describe, it, expect } from "vitest";
import { guardarIAPlataformaDto } from "./iaPlataforma.dto";

/**
 * El nombre del modelo se valida al guardar porque el síntoma aparecía
 * lejísimos de la pantalla de la IA de la plataforma: con `openai-4o-mini` cargado, la
 * app se mostraba con la IA activa y el chat y el análisis de foto contestaban
 * con los textos de demostración, sin nada que apuntara a la configuración.
 */
describe("guardarIAPlataformaDto — nombre del modelo", () => {
  it("rechaza un modelo de OpenRouter sin el prefijo del proveedor", () => {
    const r = guardarIAPlataformaDto.safeParse({
      proveedorIA: "OPENROUTER",
      modeloIA: "openai-4o-mini",
    });

    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("openai/gpt-4o-mini");
  });

  it("acepta un modelo de OpenRouter bien escrito", () => {
    for (const modelo of [
      "openai/gpt-4o-mini",
      "anthropic/claude-opus-5",
      "google/gemini-2.5-pro",
    ]) {
      const r = guardarIAPlataformaDto.safeParse({
        proveedorIA: "OPENROUTER",
        modeloIA: modelo,
      });
      expect(r.success, modelo).toBe(true);
    }
  });

  it("rechaza un nombre de OpenRouter cuando el proveedor es Anthropic", () => {
    const r = guardarIAPlataformaDto.safeParse({
      proveedorIA: "ANTHROPIC",
      modeloIA: "anthropic/claude-opus-5",
    });

    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("claude-opus-5");
  });

  it("acepta el modelo vacío: significa dejar el que ya estaba", () => {
    const r = guardarIAPlataformaDto.safeParse({
      proveedorIA: "OPENROUTER",
      claves: { OPENROUTER: "sk-or-nueva" },
    });

    expect(r.success).toBe(true);
  });

  /** Guardar solo una clave no manda proveedor: no hay qué validar. */
  it("no valida el modelo si no viene el proveedor", () => {
    const r = guardarIAPlataformaDto.safeParse({
      claves: { OPENAI: "sk-nueva" },
      modeloIA: "cualquiera",
    });

    expect(r.success).toBe(true);
  });

  it("valida también el modelo de voz a texto contra su proveedor", () => {
    const r = guardarIAPlataformaDto.safeParse({
      proveedorTranscripcion: "OPENAI",
      modeloTranscripcion: "openai/gpt-4o-transcribe",
    });

    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["modeloTranscripcion"]);
  });
});
