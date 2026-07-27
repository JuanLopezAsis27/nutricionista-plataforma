import { describe, it, expect, vi } from "vitest";
import { CrearAxioma } from "./CrearAxioma";
import { ActualizarAxioma } from "./ActualizarAxioma";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { ErrorAxiomaNoEncontrado } from "../../errores/ErrorAxiomaNoEncontrado";
import { mockAxiomaRepositorio, axiomaEjemplo } from "../_ayudas-test";

describe("CrearAxioma", () => {
  it("crea un axioma válido", async () => {
    const crear = vi.fn(async (a) => a);
    const axioma = await new CrearAxioma(mockAxiomaRepositorio({ crear })).ejecutar({
      ambito: "HIDRATACION",
      parametro: "aguaMl",
      operador: "MAYOR_IGUAL",
      valor: 2000,
      unidad: "ml",
      texto: "Tomar al menos 2 L de agua por día.",
    });

    expect(axioma.parametro).toBe("aguaMl");
    expect(crear).toHaveBeenCalledOnce();
  });

  it("rechaza un axioma ENTRE sin valor máximo", async () => {
    await expect(
      new CrearAxioma(mockAxiomaRepositorio()).ejecutar({
        ambito: "PESO",
        parametro: "imc",
        operador: "ENTRE",
        valor: 18.5,
        texto: "IMC saludable",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });
});

describe("ActualizarAxioma", () => {
  it("lanza ErrorAxiomaNoEncontrado si el axioma no existe", async () => {
    await expect(
      new ActualizarAxioma(
        mockAxiomaRepositorio({ obtenerPorId: vi.fn(async () => null) }),
      ).ejecutar("inexistente", { texto: "x" }),
    ).rejects.toBeInstanceOf(ErrorAxiomaNoEncontrado);
  });

  it("aplica los cambios sobre el axioma existente", async () => {
    const actualizar = vi.fn(async (a) => a);
    const repo = mockAxiomaRepositorio({
      obtenerPorId: vi.fn(async () => axiomaEjemplo()),
      actualizar,
    });

    const resultado = await new ActualizarAxioma(repo).ejecutar("axi-1", { valor: 8 });

    expect(resultado.aPrimitivos().valor).toBe(8);
    expect(actualizar).toHaveBeenCalledOnce();
  });
});
