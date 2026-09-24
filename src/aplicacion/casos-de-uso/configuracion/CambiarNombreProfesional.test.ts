import { describe, it, expect } from "vitest";
import { CambiarNombreProfesional } from "./CambiarNombreProfesional";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { mockNutricionistaRepositorio } from "../_ayudas-test";

describe("CambiarNombreProfesional", () => {
  it("guarda el nombre sin espacios de más", async () => {
    const nutricionistas = mockNutricionistaRepositorio();

    const nombre = await new CambiarNombreProfesional(nutricionistas).ejecutar(
      "  Lic. Ana Gómez ",
    );

    expect(nombre).toBe("Lic. Ana Gómez");
    expect(nutricionistas.renombrarActual).toHaveBeenCalledWith(
      "Lic. Ana Gómez",
    );
  });

  it("no deja vaciarlo: firma los emails y los recordatorios", async () => {
    const nutricionistas = mockNutricionistaRepositorio();

    await expect(
      new CambiarNombreProfesional(nutricionistas).ejecutar("   "),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(nutricionistas.renombrarActual).not.toHaveBeenCalled();
  });
});
