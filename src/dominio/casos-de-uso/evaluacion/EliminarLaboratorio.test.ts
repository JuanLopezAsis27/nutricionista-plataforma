import { describe, it, expect, vi } from "vitest";
import { EliminarLaboratorio } from "./EliminarLaboratorio";
import { ErrorLaboratorioNoEncontrado } from "../../errores/ErrorLaboratorioNoEncontrado";
import {
  mockLaboratorioRepositorio,
  mockArchivoRepositorio,
  mockAlmacenamientoArchivos,
  laboratorioEjemplo,
  archivoEjemplo,
} from "../_ayudas-test";

describe("EliminarLaboratorio", () => {
  it("elimina el estudio y borra sus adjuntos del bucket", async () => {
    const adjunto = archivoEjemplo();
    const laboratorios = mockLaboratorioRepositorio({
      obtenerPorId: vi.fn(async () => laboratorioEjemplo()),
    });
    const archivos = mockArchivoRepositorio({
      listarPorDueno: vi.fn(async () => [adjunto]),
    });
    const almacenamiento = mockAlmacenamientoArchivos();
    const casoUso = new EliminarLaboratorio(
      laboratorios,
      archivos,
      almacenamiento,
    );

    await casoUso.ejecutar("lab-1");

    expect(laboratorios.eliminar).toHaveBeenCalledWith("lab-1");
    expect(archivos.listarPorDueno).toHaveBeenCalledWith({
      laboratorioId: "lab-1",
    });
    expect(almacenamiento.eliminar).toHaveBeenCalledWith(adjunto.clave);
  });

  it("rechaza si el laboratorio no existe", async () => {
    const casoUso = new EliminarLaboratorio(
      mockLaboratorioRepositorio(),
      mockArchivoRepositorio(),
      mockAlmacenamientoArchivos(),
    );
    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorLaboratorioNoEncontrado,
    );
  });
});
