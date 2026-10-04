import { describe, it, expect, vi } from "vitest";
import { CrearMaterial } from "./CrearMaterial";
import { MaterialBiblioteca } from "@/dominio/entidades/MaterialBiblioteca";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorGrupoMaterialNoEncontrado } from "@/dominio/errores/ErrorGrupoMaterialNoEncontrado";
import {
  mockMaterialRepositorio,
  mockGrupoMaterialRepositorio,
  grupoMaterialEjemplo,
} from "../_ayudas-test";

describe("CrearMaterial", () => {
  it("crea un material ARCHIVO vinculando el archivo subido", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new CrearMaterial(
      materiales,
      mockGrupoMaterialRepositorio(),
    );

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
    const casoUso = new CrearMaterial(
      materiales,
      mockGrupoMaterialRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ tipo: "ARCHIVO", titulo: "Sin archivo" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(materiales.crear).not.toHaveBeenCalled();
  });

  it("rechaza un ENLACE con URL inválida (regla de la entidad)", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new CrearMaterial(
      materiales,
      mockGrupoMaterialRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ tipo: "ENLACE", titulo: "Video", url: "no-es-url" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("crea un ENLACE válido sin archivo", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new CrearMaterial(
      materiales,
      mockGrupoMaterialRepositorio(),
    );

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

  it("crea el material adentro de la carpeta abierta", async () => {
    const materiales = mockMaterialRepositorio();
    const grupos = mockGrupoMaterialRepositorio({
      obtenerPorId: vi.fn(async () => grupoMaterialEjemplo()),
    });

    const material = await new CrearMaterial(materiales, grupos).ejecutar({
      tipo: "ENLACE",
      titulo: "Video",
      url: "https://youtube.com/watch?v=x",
      grupoId: "gmat-1",
    });

    expect(material.grupoId).toBe("gmat-1");
  });

  it("rechaza una carpeta que no existe antes de escribir", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new CrearMaterial(
      materiales,
      mockGrupoMaterialRepositorio(),
    );

    await expect(
      casoUso.ejecutar({
        tipo: "ENLACE",
        titulo: "Video",
        url: "https://youtube.com/watch?v=x",
        grupoId: "gmat-x",
      }),
    ).rejects.toBeInstanceOf(ErrorGrupoMaterialNoEncontrado);
    expect(materiales.crear).not.toHaveBeenCalled();
  });
});
