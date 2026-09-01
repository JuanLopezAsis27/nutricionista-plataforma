import { describe, it, expect, vi } from "vitest";
import { CrearGrupoReceta } from "./CrearGrupoReceta";
import { ActualizarGrupoReceta } from "./ActualizarGrupoReceta";
import { EliminarGrupoReceta } from "./EliminarGrupoReceta";
import { ObtenerGruposReceta } from "./ObtenerGruposReceta";
import { GrupoReceta } from "@/dominio/entidades/GrupoReceta";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorGrupoRecetaDuplicado } from "@/dominio/errores/ErrorGrupoRecetaDuplicado";
import { ErrorGrupoRecetaNoEncontrado } from "@/dominio/errores/ErrorGrupoRecetaNoEncontrado";
import {
  mockGrupoRecetaRepositorio,
  grupoRecetaEjemplo,
} from "../_ayudas-test";

describe("CrearGrupoReceta", () => {
  it("crea la carpeta cuando el nombre está libre", async () => {
    const grupos = mockGrupoRecetaRepositorio();
    const casoUso = new CrearGrupoReceta(grupos);

    const grupo = await casoUso.ejecutar({ nombre: "Desayunos" });

    expect(grupo).toBeInstanceOf(GrupoReceta);
    expect(grupo.nombre).toBe("Desayunos");
    expect(grupos.crear).toHaveBeenCalledOnce();
  });

  it("rechaza un nombre que ya está en uso", async () => {
    const grupos = mockGrupoRecetaRepositorio({
      existeNombre: vi.fn(async () => true),
    });
    const casoUso = new CrearGrupoReceta(grupos);

    await expect(
      casoUso.ejecutar({ nombre: "Desayunos" }),
    ).rejects.toBeInstanceOf(ErrorGrupoRecetaDuplicado);
    expect(grupos.crear).not.toHaveBeenCalled();
  });

  it("rechaza una carpeta sin nombre", async () => {
    const grupos = mockGrupoRecetaRepositorio();
    const casoUso = new CrearGrupoReceta(grupos);

    await expect(casoUso.ejecutar({ nombre: "   " })).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(grupos.crear).not.toHaveBeenCalled();
  });
});

describe("ActualizarGrupoReceta", () => {
  it("renombra la carpeta", async () => {
    const grupos = mockGrupoRecetaRepositorio({
      obtenerPorId: vi.fn(async () => grupoRecetaEjemplo()),
    });
    const casoUso = new ActualizarGrupoReceta(grupos);

    const grupo = await casoUso.ejecutar({ id: "grec-1", nombre: "Meriendas" });

    expect(grupo.nombre).toBe("Meriendas");
    expect(grupos.actualizar).toHaveBeenCalledOnce();
  });

  it("se excluye a sí misma al buscar duplicados", async () => {
    const grupos = mockGrupoRecetaRepositorio({
      obtenerPorId: vi.fn(async () => grupoRecetaEjemplo()),
    });
    const casoUso = new ActualizarGrupoReceta(grupos);

    await casoUso.ejecutar({
      id: "grec-1",
      nombre: "Desayunos",
      descripcion: "Nueva",
    });

    // Sin `excluirId`, editar la descripción chocaría con su propio nombre.
    expect(grupos.existeNombre).toHaveBeenCalledWith("Desayunos", "grec-1");
  });

  it("rechaza renombrarla a un nombre ya usado", async () => {
    const grupos = mockGrupoRecetaRepositorio({
      obtenerPorId: vi.fn(async () => grupoRecetaEjemplo()),
      existeNombre: vi.fn(async () => true),
    });
    const casoUso = new ActualizarGrupoReceta(grupos);

    await expect(
      casoUso.ejecutar({ id: "grec-1", nombre: "Sin TACC" }),
    ).rejects.toBeInstanceOf(ErrorGrupoRecetaDuplicado);
    expect(grupos.actualizar).not.toHaveBeenCalled();
  });

  it("lanza ErrorGrupoRecetaNoEncontrado si la carpeta no existe", async () => {
    const grupos = mockGrupoRecetaRepositorio();
    const casoUso = new ActualizarGrupoReceta(grupos);

    await expect(
      casoUso.ejecutar({ id: "grec-x", nombre: "X" }),
    ).rejects.toBeInstanceOf(ErrorGrupoRecetaNoEncontrado);
  });
});

describe("EliminarGrupoReceta", () => {
  it("borra la carpeta sin exigir que esté vacía", async () => {
    const grupos = mockGrupoRecetaRepositorio({
      obtenerPorId: vi.fn(async () => grupoRecetaEjemplo()),
    });
    const casoUso = new EliminarGrupoReceta(grupos);

    await casoUso.ejecutar("grec-1");

    // Las recetas quedan sueltas (FK SET NULL): borrar el rótulo no puede
    // llevarse el contenido.
    expect(grupos.eliminar).toHaveBeenCalledWith("grec-1");
  });

  it("lanza ErrorGrupoRecetaNoEncontrado si no existe", async () => {
    const grupos = mockGrupoRecetaRepositorio();
    const casoUso = new EliminarGrupoReceta(grupos);

    await expect(casoUso.ejecutar("grec-x")).rejects.toBeInstanceOf(
      ErrorGrupoRecetaNoEncontrado,
    );
    expect(grupos.eliminar).not.toHaveBeenCalled();
  });
});

describe("ObtenerGruposReceta", () => {
  it("devuelve las carpetas con su total", async () => {
    const grupos = mockGrupoRecetaRepositorio({
      listar: vi.fn(async () => [
        { grupo: grupoRecetaEjemplo(), cantidadRecetas: 7 },
      ]),
    });

    const resultado = await new ObtenerGruposReceta(grupos).ejecutar();

    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.cantidadRecetas).toBe(7);
  });
});
