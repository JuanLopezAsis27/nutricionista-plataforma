import { describe, it, expect, vi } from "vitest";
import { CrearReceta } from "./CrearReceta";
import { Receta } from "../../entidades/Receta";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import { mockRecetaRepositorio } from "../_ayudas-test";

describe("CrearReceta", () => {
  it("crea una receta y vincula las fotos ya subidas", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new CrearReceta(recetas);

    const receta = await casoUso.ejecutar({
      nombre: "Bowl de pollo",
      ingredientes: [{ nombre: "pollo" }, { nombre: "arroz" }],
      fotoIds: ["arc-1", "arc-2"],
    });

    expect(receta).toBeInstanceOf(Receta);
    expect(recetas.crear).toHaveBeenCalledOnce();
    expect(recetas.crear).toHaveBeenCalledWith(expect.any(Receta), ["arc-1", "arc-2"]);
  });

  it("combina fotos y documentos en una sola lista de archivos a vincular", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new CrearReceta(recetas);

    await casoUso.ejecutar({
      nombre: "Bowl de pollo",
      fotoIds: ["foto-1"],
      documentoIds: ["doc-1", "doc-2"],
    });

    expect(recetas.crear).toHaveBeenCalledWith(expect.any(Receta), ["foto-1", "doc-1", "doc-2"]);
  });

  it("normaliza los enlaces (valida URLs http/https y deduplica)", async () => {
    const recetas = mockRecetaRepositorio({ crear: vi.fn(async (r: Receta) => r) });
    const casoUso = new CrearReceta(recetas);

    const receta = await casoUso.ejecutar({
      nombre: "Tarta",
      enlaces: ["https://a.com", " https://a.com ", "https://b.com"],
    });

    expect(receta.aPrimitivos().enlaces).toEqual(["https://a.com", "https://b.com"]);
  });

  it("rechaza un enlace que no sea http/https", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new CrearReceta(recetas);

    await expect(
      casoUso.ejecutar({ nombre: "Tarta", enlaces: ["ftp://x.com"] }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(recetas.crear).not.toHaveBeenCalled();
  });

  it("lanza ErrorValidacion si el nombre está vacío", async () => {
    const recetas = mockRecetaRepositorio();
    const casoUso = new CrearReceta(recetas);

    await expect(casoUso.ejecutar({ nombre: "   " })).rejects.toBeInstanceOf(ErrorValidacion);
    expect(recetas.crear).not.toHaveBeenCalled();
  });

  it("descarta ingredientes vacíos al normalizar", async () => {
    const recetas = mockRecetaRepositorio({
      crear: vi.fn(async (r: Receta) => r),
    });
    const casoUso = new CrearReceta(recetas);

    const receta = await casoUso.ejecutar({
      nombre: "Ensalada",
      ingredientes: [{ nombre: "lechuga" }, { nombre: "  " }, { nombre: "tomate" }],
    });

    expect(receta.aPrimitivos().ingredientes.map((i) => i.nombre)).toEqual([
      "lechuga",
      "tomate",
    ]);
  });
});
