import { describe, it, expect, vi } from "vitest";
import { ObtenerHistorialObjetivo } from "./ObtenerHistorialObjetivo";
import { ErrorObjetivoNoEncontrado } from "@/dominio/errores/ErrorObjetivoNoEncontrado";
import { mockObjetivoRepositorio, objetivoEjemplo } from "../_ayudas-test";

describe("ObtenerHistorialObjetivo", () => {
  it("devuelve la línea de tiempo del objetivo", async () => {
    const objetivos = mockObjetivoRepositorio({
      obtenerPorId: vi.fn(async () => objetivoEjemplo()),
      listarHistorial: vi.fn(async () => [
        {
          id: "evt-1",
          tipo: "CREACION" as const,
          detalle: "Objetivo creado.",
          motivo: null,
          creadoEn: new Date("2026-07-01"),
        },
      ]),
    });
    const casoUso = new ObtenerHistorialObjetivo(objetivos);

    const historial = await casoUso.ejecutar("obj-1");

    expect(historial).toHaveLength(1);
    expect(objetivos.listarHistorial).toHaveBeenCalledWith("obj-1");
  });

  it("lanza ErrorObjetivoNoEncontrado si no existe", async () => {
    const casoUso = new ObtenerHistorialObjetivo(mockObjetivoRepositorio());
    await expect(casoUso.ejecutar("nada")).rejects.toBeInstanceOf(
      ErrorObjetivoNoEncontrado,
    );
  });
});
