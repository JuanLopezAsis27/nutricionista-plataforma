import { describe, it, expect, vi } from "vitest";
import type { IPromptIARepositorio } from "@/dominio/repositorios/IPromptIARepositorio";
import {
  CLAVES_PROMPT_IA,
  promptPorDefecto,
} from "@/dominio/servicios/promptsIA";
import { ServicioPromptsIA } from "./ServicioPromptsIA";

function repositorio(propios: Partial<Record<string, string>> = {}) {
  return {
    obtenerTodos: vi.fn().mockResolvedValue(propios),
    guardar: vi.fn().mockResolvedValue(undefined),
    restablecer: vi.fn().mockResolvedValue(undefined),
  } satisfies IPromptIARepositorio;
}

describe("ServicioPromptsIA", () => {
  it("lista las siete funcionalidades, personalizadas o no", async () => {
    const repo = repositorio({ ANALISIS_COMIDA: "Mirá la foto." });

    const lista = await new ServicioPromptsIA(repo).listar();

    expect(lista).toHaveLength(CLAVES_PROMPT_IA.length);
    const comida = lista.find((p) => p.clave === "ANALISIS_COMIDA");
    expect(comida?.personalizado).toBe("Mirá la foto.");
    expect(comida?.porDefecto).toBe(promptPorDefecto("ANALISIS_COMIDA"));
    expect(
      lista.find((p) => p.clave === "MEDICIONES")?.personalizado,
    ).toBeNull();
  });

  it("guarda el texto propio recortado", async () => {
    const repo = repositorio();

    await new ServicioPromptsIA(repo).guardar("MEDICIONES", "  Leé la tabla. ");

    expect(repo.guardar).toHaveBeenCalledWith("MEDICIONES", "Leé la tabla.");
  });

  /**
   * Pegar el texto de fábrica es volver atrás, no personalizar. Guardarlo como
   * propio dejaría una copia congelada que ya no recibe las mejoras que la app
   * le haga al prompt en versiones nuevas.
   */
  it("guardar el texto de fábrica borra la personalización", async () => {
    const repo = repositorio({ MEDICIONES: "algo viejo" });

    await new ServicioPromptsIA(repo).guardar(
      "MEDICIONES",
      promptPorDefecto("MEDICIONES"),
    );

    expect(repo.restablecer).toHaveBeenCalledWith("MEDICIONES");
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it("restablecer delega en el repositorio", async () => {
    const repo = repositorio();

    await new ServicioPromptsIA(repo).restablecer("FICHA_PACIENTE");

    expect(repo.restablecer).toHaveBeenCalledWith("FICHA_PACIENTE");
  });
});
