import { describe, it, expect, vi } from "vitest";
import { CrearPlantilla } from "./CrearPlantilla";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockPlantillaEmailRepositorio, plantillaEmailEjemplo } from "../_ayudas-test";

const datos = {
  clave: "SEGUIMIENTO",
  nombre: "Seguimiento",
  asunto: "¿Cómo vas, {{paciente}}?",
  cuerpoHtml: "<p>Hola {{paciente}}</p>",
};

describe("CrearPlantilla", () => {
  it("crea una plantilla no-sistema con clave única", async () => {
    const crear = vi.fn(async (p) => p);
    const repo = mockPlantillaEmailRepositorio({
      obtenerPorClave: vi.fn(async () => null),
      crear,
    });

    const plantilla = await new CrearPlantilla(repo).ejecutar(datos);

    expect(plantilla.clave).toBe("SEGUIMIENTO");
    expect(plantilla.deSistema).toBe(false);
    expect(crear).toHaveBeenCalledOnce();
  });

  it("rechaza una clave ya existente", async () => {
    const repo = mockPlantillaEmailRepositorio({
      obtenerPorClave: vi.fn(async () => plantillaEmailEjemplo({ clave: "SEGUIMIENTO" })),
    });

    await expect(new CrearPlantilla(repo).ejecutar(datos)).rejects.toBeInstanceOf(ErrorValidacion);
  });
});
