import { describe, it, expect, vi } from "vitest";
import { MoverRecetaAGrupo } from "./MoverRecetaAGrupo";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";
import { ErrorGrupoRecetaNoEncontrado } from "@/dominio/errores/ErrorGrupoRecetaNoEncontrado";
import {
  mockRecetaRepositorio,
  mockGrupoRecetaRepositorio,
  recetaEjemplo,
  grupoRecetaEjemplo,
} from "../_ayudas-test";

describe("MoverRecetaAGrupo", () => {
  it("mueve la receta a la carpeta", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
    });
    const grupos = mockGrupoRecetaRepositorio({
      obtenerPorId: vi.fn(async () => grupoRecetaEjemplo()),
    });
    const casoUso = new MoverRecetaAGrupo(recetas, grupos);

    await casoUso.ejecutar({ recetaId: "rec-1", grupoId: "grec-1" });

    // Toca SOLO la carpeta: mover no puede reescribir el contenido de la
    // receta (ingredientes, fotos, preparación).
    expect(recetas.moverAGrupo).toHaveBeenCalledWith("rec-1", "grec-1");
    expect(recetas.actualizar).not.toHaveBeenCalled();
  });

  it("saca la receta de la carpeta con grupoId null, sin buscar carpeta", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
    });
    const grupos = mockGrupoRecetaRepositorio();
    const casoUso = new MoverRecetaAGrupo(recetas, grupos);

    await casoUso.ejecutar({ recetaId: "rec-1", grupoId: null });

    expect(recetas.moverAGrupo).toHaveBeenCalledWith("rec-1", null);
    expect(grupos.obtenerPorId).not.toHaveBeenCalled();
  });

  it("lanza ErrorRecetaNoEncontrada si la receta no existe", async () => {
    const casoUso = new MoverRecetaAGrupo(
      mockRecetaRepositorio(),
      mockGrupoRecetaRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ recetaId: "rec-x", grupoId: null }),
    ).rejects.toBeInstanceOf(ErrorRecetaNoEncontrada);
  });

  it("lanza ErrorGrupoRecetaNoEncontrado si la carpeta no existe", async () => {
    const recetas = mockRecetaRepositorio({
      obtenerPorId: vi.fn(async () => recetaEjemplo()),
    });
    const casoUso = new MoverRecetaAGrupo(
      recetas,
      mockGrupoRecetaRepositorio(),
    );

    // Se comprueba antes de escribir: la FK lo rechazaría igual, pero como
    // error de base y no como "esa carpeta no existe".
    await expect(
      casoUso.ejecutar({ recetaId: "rec-1", grupoId: "grec-x" }),
    ).rejects.toBeInstanceOf(ErrorGrupoRecetaNoEncontrado);
    expect(recetas.moverAGrupo).not.toHaveBeenCalled();
  });
});
