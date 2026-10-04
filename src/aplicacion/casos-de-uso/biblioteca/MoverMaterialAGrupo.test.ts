import { describe, it, expect, vi } from "vitest";
import { MoverMaterialAGrupo } from "./MoverMaterialAGrupo";
import { ErrorMaterialNoEncontrado } from "@/dominio/errores/ErrorMaterialNoEncontrado";
import { ErrorGrupoMaterialNoEncontrado } from "@/dominio/errores/ErrorGrupoMaterialNoEncontrado";
import {
  mockMaterialRepositorio,
  mockGrupoMaterialRepositorio,
  materialEjemplo,
  grupoMaterialEjemplo,
} from "../_ayudas-test";

describe("MoverMaterialAGrupo", () => {
  it("mueve el material a la carpeta", async () => {
    const materiales = mockMaterialRepositorio({
      obtenerPorId: vi.fn(async () => materialEjemplo()),
    });
    const grupos = mockGrupoMaterialRepositorio({
      obtenerPorId: vi.fn(async () => grupoMaterialEjemplo()),
    });

    await new MoverMaterialAGrupo(materiales, grupos).ejecutar({
      materialId: "mat-1",
      grupoId: "gmat-1",
    });

    expect(materiales.moverAGrupo).toHaveBeenCalledWith("mat-1", "gmat-1");
  });

  it("con grupoId null lo saca de la carpeta sin buscar ninguna", async () => {
    const materiales = mockMaterialRepositorio({
      obtenerPorId: vi.fn(async () => materialEjemplo()),
    });
    const grupos = mockGrupoMaterialRepositorio();

    await new MoverMaterialAGrupo(materiales, grupos).ejecutar({
      materialId: "mat-1",
      grupoId: null,
    });

    expect(grupos.obtenerPorId).not.toHaveBeenCalled();
    expect(materiales.moverAGrupo).toHaveBeenCalledWith("mat-1", null);
  });

  it("lanza ErrorMaterialNoEncontrado si el material no existe", async () => {
    const materiales = mockMaterialRepositorio();
    const casoUso = new MoverMaterialAGrupo(
      materiales,
      mockGrupoMaterialRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ materialId: "mat-x", grupoId: null }),
    ).rejects.toBeInstanceOf(ErrorMaterialNoEncontrado);
    expect(materiales.moverAGrupo).not.toHaveBeenCalled();
  });

  it("lanza ErrorGrupoMaterialNoEncontrado si la carpeta no existe", async () => {
    const materiales = mockMaterialRepositorio({
      obtenerPorId: vi.fn(async () => materialEjemplo()),
    });
    const casoUso = new MoverMaterialAGrupo(
      materiales,
      mockGrupoMaterialRepositorio(),
    );

    await expect(
      casoUso.ejecutar({ materialId: "mat-1", grupoId: "gmat-x" }),
    ).rejects.toBeInstanceOf(ErrorGrupoMaterialNoEncontrado);
    expect(materiales.moverAGrupo).not.toHaveBeenCalled();
  });
});
