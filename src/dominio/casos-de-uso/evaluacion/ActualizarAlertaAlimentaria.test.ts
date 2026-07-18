import { describe, it, expect, vi } from "vitest";
import { ActualizarAlertaAlimentaria } from "./ActualizarAlertaAlimentaria";
import { ErrorAlertaAlimentariaNoEncontrada } from "../../errores/ErrorAlertaAlimentariaNoEncontrada";
import {
  mockAlertaAlimentariaRepositorio,
  alertaAlimentariaEjemplo,
} from "../_ayudas-test";

describe("ActualizarAlertaAlimentaria", () => {
  it("actualiza la alerta preservando lo no informado", async () => {
    const alertas = mockAlertaAlimentariaRepositorio({
      obtenerPorId: vi.fn(async () => alertaAlimentariaEjemplo()),
    });
    const casoUso = new ActualizarAlertaAlimentaria(alertas);

    const alerta = await casoUso.ejecutar("ale-1", { severidad: "SEVERA" });

    expect(alerta.severidad).toBe("SEVERA");
    expect(alerta.descripcion).toBe("Lactosa");
    expect(alertas.actualizar).toHaveBeenCalledOnce();
  });

  it("rechaza si la alerta no existe", async () => {
    const casoUso = new ActualizarAlertaAlimentaria(mockAlertaAlimentariaRepositorio());
    await expect(
      casoUso.ejecutar("no-existe", { severidad: "SEVERA" }),
    ).rejects.toBeInstanceOf(ErrorAlertaAlimentariaNoEncontrada);
  });
});
