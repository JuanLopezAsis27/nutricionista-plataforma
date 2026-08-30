import { describe, it, expect, vi } from "vitest";
import { CambiarEstadoObjetivo } from "./CambiarEstadoObjetivo";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorObjetivoNoEncontrado } from "@/dominio/errores/ErrorObjetivoNoEncontrado";
import { mockObjetivoRepositorio, objetivoEjemplo } from "../_ayudas-test";

describe("CambiarEstadoObjetivo", () => {
  it("cambia el estado y registra CAMBIO_ESTADO con el motivo", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoEjemplo()),
    });
    const casoUso = new CambiarEstadoObjetivo(objetivos);

    const objetivo = await casoUso.ejecutar({
      id: "obj-1",
      estado: "CUMPLIDO",
      motivo: "Alcanzó el peso meta en la consulta de julio.",
    });

    expect(objetivo.estado).toBe("CUMPLIDO");
    expect(objetivos.actualizar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tipo: "CAMBIO_ESTADO",
        detalle: expect.stringContaining("EN_CURSO → CUMPLIDO"),
        motivo: "Alcanzó el peso meta en la consulta de julio.",
      }),
    );
  });

  it("rechaza el cambio sin motivo (regla de auditoría)", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoEjemplo()),
    });
    const casoUso = new CambiarEstadoObjetivo(objetivos);

    await expect(
      casoUso.ejecutar({ id: "obj-1", estado: "CUMPLIDO", motivo: "   " }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(objetivos.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza pasar al mismo estado", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoEjemplo()),
    });
    const casoUso = new CambiarEstadoObjetivo(objetivos);

    await expect(
      casoUso.ejecutar({ id: "obj-1", estado: "EN_CURSO", motivo: "x" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("lanza ErrorObjetivoNoEncontrado si no existe", async () => {
    const casoUso = new CambiarEstadoObjetivo(mockObjetivoRepositorio());
    await expect(
      casoUso.ejecutar({ id: "nada", estado: "CUMPLIDO", motivo: "x" }),
    ).rejects.toBeInstanceOf(ErrorObjetivoNoEncontrado);
  });
});
