import { describe, it, expect } from "vitest";
import { guardarCredencialesDto } from "./credenciales.dto";

/**
 * El nombre del modelo se valida al guardar porque el síntoma aparecía
 * lejísimos de la pantalla de credenciales: con `openai-4o-mini` cargado, la
 * app se mostraba con la IA activa y el chat y el análisis de foto contestaban
 * con los textos de demostración, sin nada que apuntara a la configuración.
 */
describe("guardarCredencialesDto — nombre del modelo", () => {
  it("rechaza un modelo de OpenRouter sin el prefijo del proveedor", () => {
    const r = guardarCredencialesDto.safeParse({
      proveedorIA: "OPENROUTER",
      anthropicModelo: "openai-4o-mini",
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
      const r = guardarCredencialesDto.safeParse({
        proveedorIA: "OPENROUTER",
        anthropicModelo: modelo,
      });
      expect(r.success, modelo).toBe(true);
    }
  });

  it("rechaza un nombre de OpenRouter cuando el proveedor es Anthropic", () => {
    const r = guardarCredencialesDto.safeParse({
      proveedorIA: "ANTHROPIC",
      anthropicModelo: "anthropic/claude-opus-5",
    });

    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain("claude-opus-5");
  });

  it("acepta el modelo vacío: significa dejar el que ya estaba", () => {
    const r = guardarCredencialesDto.safeParse({
      proveedorIA: "OPENROUTER",
      anthropicApiKey: "sk-or-nueva",
    });

    expect(r.success).toBe(true);
  });

  /** Guardar WhatsApp o los criterios no manda proveedor: no hay qué validar. */
  it("no valida el modelo si no viene el proveedor", () => {
    const r = guardarCredencialesDto.safeParse({
      whatsappPhoneNumberId: "123",
    });

    expect(r.success).toBe(true);
  });
});
