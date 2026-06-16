import { describe, it, expect } from "vitest";
import { CrearDieta } from "./CrearDieta";
import { Dieta, type DatosNuevaDieta } from "../../entidades/Dieta";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockDietaRepositorio } from "../_ayudas-test";

describe("CrearDieta", () => {
  it("crea una dieta con sus comidas", async () => {
    const repositorio = mockDietaRepositorio();
    const casoUso = new CrearDieta(repositorio);

    const dieta = await casoUso.ejecutar({
      nombre: "Plan A",
      descripcion: null,
      comidas: [{ tipo: "DESAYUNO", descripcion: "Avena", calorias: 300 }],
    });

    expect(dieta).toBeInstanceOf(Dieta);
    expect(dieta.comidas).toHaveLength(1);
    expect(repositorio.crear).toHaveBeenCalledOnce();
  });

  it("lanza ErrorValidacion si no hay comidas (regla de la entidad)", async () => {
    const repositorio = mockDietaRepositorio();
    const casoUso = new CrearDieta(repositorio);

    const datos = { nombre: "Vacía", descripcion: null, comidas: [] } as DatosNuevaDieta;
    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(ErrorValidacion);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });
});
