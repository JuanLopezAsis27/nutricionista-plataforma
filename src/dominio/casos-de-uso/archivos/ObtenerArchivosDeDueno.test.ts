import { describe, it, expect, vi } from "vitest";
import { ObtenerArchivosDeDueno } from "./ObtenerArchivosDeDueno";
import { mockArchivoRepositorio, archivoEjemplo } from "../_ayudas-test";

describe("ObtenerArchivosDeDueno", () => {
  it("delega el filtro de dueño al repositorio", async () => {
    const archivos = mockArchivoRepositorio({
      listarPorDueno: vi.fn(async () => [archivoEjemplo()]),
    });
    const casoUso = new ObtenerArchivosDeDueno(archivos);

    const resultado = await casoUso.ejecutar({ pacienteId: "pac-1" });

    expect(resultado).toHaveLength(1);
    expect(archivos.listarPorDueno).toHaveBeenCalledWith({ pacienteId: "pac-1" });
  });
});
