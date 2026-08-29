import { describe, it, expect } from "vitest";
import { CrearMaterial } from "./CrearMaterial";
import { MaterialBiblioteca } from "../../entidades/MaterialBiblioteca";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockMaterialRepositorio } from "../_ayudas-test";

describe("CrearMaterial", () => {
  it("crea un material ARCHIVO vinculando el archivo subido", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new CrearMaterial(materiales);

    const material = await casoUso.ejecutar({
      tipo: "ARCHIVO",
      titulo: "Guía de porciones",
      categoria: "educación",
      archivoId: "arc-1",
    });

    expect(material).toBeInstanceOf(MaterialBiblioteca);
    expect(materiales.crear).toHaveBeenCalledWith(
      expect.any(MaterialBiblioteca),
      "arc-1",
    );
  });

  it("rechaza un material ARCHIVO sin archivo subido", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new CrearMaterial(materiales);

    await expect(
      casoUso.ejecutar({ tipo: "ARCHIVO", titulo: "Sin archivo" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(materiales.crear).not.toHaveBeenCalled();
  });

  it("rechaza un ENLACE con URL inválida (regla de la entidad)", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new CrearMaterial(materiales);

    await expect(
      casoUso.ejecutar({ tipo: "ENLACE", titulo: "Video", url: "no-es-url" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("crea un ENLACE válido sin archivo", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new CrearMaterial(materiales);

    await casoUso.ejecutar({
      tipo: "ENLACE",
      titulo: "Video de batch cooking",
      url: "https://youtube.com/watch?v=x",
    });

    expect(materiales.crear).toHaveBeenCalledWith(
      expect.any(MaterialBiblioteca),
      null,
    );
  });
});
