import { describe, it, expect, vi } from "vitest";
import { EnviarEmailDePrueba } from "./EnviarEmailDePrueba";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";
import {
  mockPlantillaEmailRepositorio,
  mockEmailEnviadoRepositorio,
  mockServicioEmail,
  mockReloj,
  plantillaEmailEjemplo,
} from "../_ayudas-test";

describe("EnviarEmailDePrueba", () => {
  it("renderiza con datos de ejemplo, envía con prefijo [PRUEBA] y registra", async () => {
    const enviar = vi.fn(async () => {});
    const registrar = vi.fn(async () => {});
    const uc = new EnviarEmailDePrueba(
      mockPlantillaEmailRepositorio({ obtenerPorId: vi.fn(async () => plantillaEmailEjemplo()) }),
      mockEmailEnviadoRepositorio({ registrar }),
      mockServicioEmail({ enviar }),
      mockReloj(),
      "Lic. López Asis",
    );

    const resultado = await uc.ejecutar("pla-1", "prueba@mail.com");

    expect(resultado.para).toBe("prueba@mail.com");
    expect(enviar).toHaveBeenCalledWith(
      expect.objectContaining({
        para: "prueba@mail.com",
        asunto: expect.stringMatching(/^\[PRUEBA\]/),
        html: expect.stringContaining("Juan Pérez"),
      }),
    );
    expect(registrar).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPlantillaNoEncontrada si la plantilla no existe", async () => {
    const uc = new EnviarEmailDePrueba(
      mockPlantillaEmailRepositorio({ obtenerPorId: vi.fn(async () => null) }),
      mockEmailEnviadoRepositorio(),
      mockServicioEmail(),
      mockReloj(),
      "Lic. López Asis",
    );

    await expect(uc.ejecutar("x", "a@b.com")).rejects.toBeInstanceOf(ErrorPlantillaNoEncontrada);
  });
});
