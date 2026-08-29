import { describe, it, expect, vi } from "vitest";
import { EliminarGrupoPlan } from "./EliminarGrupoPlan";
import { ErrorGrupoPlanNoEncontrado } from "../../errores/ErrorGrupoPlanNoEncontrado";
import { mockGrupoPlanRepositorio, grupoPlanEjemplo } from "../_ayudas-test";

describe("EliminarGrupoPlan", () => {
  it("borra la carpeta sin exigir que esté vacía", async () => {
    const grupos = mockGrupoPlanRepositorio({
      obtenerPorId: vi.fn(async () => grupoPlanEjemplo()),
    });
    const casoUso = new EliminarGrupoPlan(grupos);

    await casoUso.ejecutar("gru-1");

    // Los planes quedan sueltos (FK SET NULL): borrar el rótulo no puede
    // llevarse el contenido.
    expect(grupos.eliminar).toHaveBeenCalledWith("gru-1");
  });

  it("lanza ErrorGrupoPlanNoEncontrado si la carpeta no existe", async () => {
    const grupos = mockGrupoPlanRepositorio();
    const casoUso = new EliminarGrupoPlan(grupos);

    await expect(casoUso.ejecutar("gru-x")).rejects.toBeInstanceOf(
      ErrorGrupoPlanNoEncontrado,
    );
    expect(grupos.eliminar).not.toHaveBeenCalled();
  });
});
