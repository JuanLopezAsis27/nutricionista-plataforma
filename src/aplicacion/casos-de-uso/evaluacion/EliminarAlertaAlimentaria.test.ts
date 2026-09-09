import { describe, it, expect, vi } from "vitest";
import { EliminarAlertaAlimentaria } from "./EliminarAlertaAlimentaria";
import { ErrorAlertaAlimentariaNoEncontrada } from "@/dominio/errores/ErrorAlertaAlimentariaNoEncontrada";
import {
  mockAlertaAlimentariaRepositorio,
  alertaAlimentariaEjemplo,
} from "../_ayudas-test";

describe("EliminarAlertaAlimentaria", () => {
  it("elimina la alerta existente", async () => {
    const alertas = mockAlertaAlimentariaRepositorio({
      obtenerPorId: vi.fn(async () => alertaAlimentariaEjemplo()),
    });
    const casoUso = new EliminarAlertaAlimentaria(alertas);

    await casoUso.ejecutar("ale-1");

    expect(alertas.eliminar).toHaveBeenCalledWith("ale-1");
  });

  it("rechaza si la alerta no existe", async () => {
    const casoUso = new EliminarAlertaAlimentaria(
      mockAlertaAlimentariaRepositorio(),
    );
    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorAlertaAlimentariaNoEncontrada,
    );
  });
});
