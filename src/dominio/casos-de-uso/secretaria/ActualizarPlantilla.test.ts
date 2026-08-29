import { describe, it, expect, vi } from "vitest";
import { ActualizarPlantilla } from "./ActualizarPlantilla";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";
import {
  mockPlantillaEmailRepositorio,
  plantillaEmailEjemplo,
} from "../_ayudas-test";

describe("ActualizarPlantilla", () => {
  it("edita el contenido y persiste la plantilla", async () => {
    const actualizar = vi.fn(async (p) => p);
    const repo = mockPlantillaEmailRepositorio({
      obtenerPorId: vi.fn(async () => plantillaEmailEjemplo()),
      actualizar,
    });

    const editada = await new ActualizarPlantilla(repo).ejecutar({
      id: "pla-1",
      nombre: "Recordatorio v2",
      asunto: "Tu turno mañana",
      cuerpoHtml: "<p>{{paciente}}</p>",
    });

    expect(editada.aPrimitivos().nombre).toBe("Recordatorio v2");
    expect(editada.clave).toBe("RECORDATORIO_TURNO"); // clave preservada
    expect(actualizar).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPlantillaNoEncontrada si no existe", async () => {
    const repo = mockPlantillaEmailRepositorio({
      obtenerPorId: vi.fn(async () => null),
    });

    await expect(
      new ActualizarPlantilla(repo).ejecutar({
        id: "x",
        nombre: "n",
        asunto: "a",
        cuerpoHtml: "<p>c</p>",
      }),
    ).rejects.toBeInstanceOf(ErrorPlantillaNoEncontrada);
  });
});
