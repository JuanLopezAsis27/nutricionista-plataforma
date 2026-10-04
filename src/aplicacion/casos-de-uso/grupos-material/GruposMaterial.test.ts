import { describe, it, expect, vi } from "vitest";
import { CrearGrupoMaterial } from "./CrearGrupoMaterial";
import { ActualizarGrupoMaterial } from "./ActualizarGrupoMaterial";
import { EliminarGrupoMaterial } from "./EliminarGrupoMaterial";
import { ObtenerGruposMaterial } from "./ObtenerGruposMaterial";
import { GrupoMaterial } from "@/dominio/entidades/GrupoMaterial";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorGrupoMaterialDuplicado } from "@/dominio/errores/ErrorGrupoMaterialDuplicado";
import { ErrorGrupoMaterialNoEncontrado } from "@/dominio/errores/ErrorGrupoMaterialNoEncontrado";
import {
  mockGrupoMaterialRepositorio,
  grupoMaterialEjemplo,
} from "../_ayudas-test";

describe("CrearGrupoMaterial", () => {
  it("crea la carpeta cuando el nombre está libre", async () => {
    const grupos = mockGrupoMaterialRepositorio();
    const casoUso = new CrearGrupoMaterial(grupos);

    const grupo = await casoUso.ejecutar({ nombre: "Guías de inicio" });

    expect(grupo).toBeInstanceOf(GrupoMaterial);
    expect(grupo.nombre).toBe("Guías de inicio");
    expect(grupos.crear).toHaveBeenCalledOnce();
  });

  it("rechaza un nombre que ya está en uso", async () => {
    const grupos = mockGrupoMaterialRepositorio({
      existeNombre: vi.fn(async () => true),
    });
    const casoUso = new CrearGrupoMaterial(grupos);

    await expect(
      casoUso.ejecutar({ nombre: "Guías de inicio" }),
    ).rejects.toBeInstanceOf(ErrorGrupoMaterialDuplicado);
    expect(grupos.crear).not.toHaveBeenCalled();
  });

  it("rechaza una carpeta sin nombre", async () => {
    const grupos = mockGrupoMaterialRepositorio();
    const casoUso = new CrearGrupoMaterial(grupos);

    await expect(casoUso.ejecutar({ nombre: "   " })).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(grupos.crear).not.toHaveBeenCalled();
  });
});

describe("ActualizarGrupoMaterial", () => {
  it("renombra la carpeta", async () => {
    const grupos = mockGrupoMaterialRepositorio({
      obtenerPorId: vi.fn(async () => grupoMaterialEjemplo()),
    });
    const casoUso = new ActualizarGrupoMaterial(grupos);

    const grupo = await casoUso.ejecutar({
      id: "gmat-1",
      nombre: "Deportistas",
    });

    expect(grupo.nombre).toBe("Deportistas");
    expect(grupos.actualizar).toHaveBeenCalledOnce();
  });

  it("se excluye a sí misma al buscar duplicados", async () => {
    const grupos = mockGrupoMaterialRepositorio({
      obtenerPorId: vi.fn(async () => grupoMaterialEjemplo()),
    });
    const casoUso = new ActualizarGrupoMaterial(grupos);

    await casoUso.ejecutar({
      id: "gmat-1",
      nombre: "Guías de inicio",
      descripcion: "Nueva",
    });

    // Sin `excluirId`, editar la descripción chocaría con su propio nombre.
    expect(grupos.existeNombre).toHaveBeenCalledWith(
      "Guías de inicio",
      "gmat-1",
    );
  });

  it("rechaza renombrarla a un nombre ya usado", async () => {
    const grupos = mockGrupoMaterialRepositorio({
      obtenerPorId: vi.fn(async () => grupoMaterialEjemplo()),
      existeNombre: vi.fn(async () => true),
    });
    const casoUso = new ActualizarGrupoMaterial(grupos);

    await expect(
      casoUso.ejecutar({ id: "gmat-1", nombre: "Hábitos" }),
    ).rejects.toBeInstanceOf(ErrorGrupoMaterialDuplicado);
    expect(grupos.actualizar).not.toHaveBeenCalled();
  });

  it("lanza ErrorGrupoMaterialNoEncontrado si la carpeta no existe", async () => {
    const grupos = mockGrupoMaterialRepositorio();
    const casoUso = new ActualizarGrupoMaterial(grupos);

    await expect(
      casoUso.ejecutar({ id: "gmat-x", nombre: "X" }),
    ).rejects.toBeInstanceOf(ErrorGrupoMaterialNoEncontrado);
  });
});

describe("EliminarGrupoMaterial", () => {
  it("borra la carpeta sin exigir que esté vacía", async () => {
    const grupos = mockGrupoMaterialRepositorio({
      obtenerPorId: vi.fn(async () => grupoMaterialEjemplo()),
    });
    const casoUso = new EliminarGrupoMaterial(grupos);

    await casoUso.ejecutar("gmat-1");

    // Los materiales quedan sueltos (FK SET NULL): borrar el rótulo no puede
    // llevarse el contenido.
    expect(grupos.eliminar).toHaveBeenCalledWith("gmat-1");
  });

  it("lanza ErrorGrupoMaterialNoEncontrado si no existe", async () => {
    const grupos = mockGrupoMaterialRepositorio();
    const casoUso = new EliminarGrupoMaterial(grupos);

    await expect(casoUso.ejecutar("gmat-x")).rejects.toBeInstanceOf(
      ErrorGrupoMaterialNoEncontrado,
    );
    expect(grupos.eliminar).not.toHaveBeenCalled();
  });
});

describe("ObtenerGruposMaterial", () => {
  it("devuelve las carpetas con su total", async () => {
    const grupos = mockGrupoMaterialRepositorio({
      listar: vi.fn(async () => [
        { grupo: grupoMaterialEjemplo(), cantidadMateriales: 7 },
      ]),
    });

    const resultado = await new ObtenerGruposMaterial(grupos).ejecutar();

    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.cantidadMateriales).toBe(7);
  });
});
