import { describe, it, expect, vi } from "vitest";
import { ResolverAlerta } from "./ResolverAlerta";
import { ErrorAlertaSeguimientoNoEncontrada } from "../../errores/ErrorAlertaSeguimientoNoEncontrada";
import { ErrorValidacion } from "../../errores/ErrorValidacion";
import {
  mockAlertaSeguimientoRepositorio,
  alertaSeguimientoEjemplo,
} from "../_ayudas-test";

describe("ResolverAlerta", () => {
  it("marca la alerta como RESUELTA con fecha", async () => {
    const alertas = mockAlertaSeguimientoRepositorio({
      obtenerPorId: vi.fn(async () => alertaSeguimientoEjemplo()),
    });
    const casoUso = new ResolverAlerta(alertas);

    const alerta = await casoUso.ejecutar({ id: "als-1", estado: "RESUELTA" });

    expect(alerta.estado).toBe("RESUELTA");
    expect(alerta.aPrimitivos().resueltaEn).not.toBeNull();
    expect(alertas.actualizar).toHaveBeenCalledOnce();
  });

  it("rechaza resolver dos veces la misma alerta", async () => {
    const resuelta = alertaSeguimientoEjemplo().resolver("DESCARTADA");
    const alertas = mockAlertaSeguimientoRepositorio({
      obtenerPorId: vi.fn(async () => resuelta),
    });
    const casoUso = new ResolverAlerta(alertas);

    await expect(
      casoUso.ejecutar({ id: "als-1", estado: "RESUELTA" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("lanza ErrorAlertaSeguimientoNoEncontrada si no existe", async () => {
    const casoUso = new ResolverAlerta(mockAlertaSeguimientoRepositorio());
    await expect(
      casoUso.ejecutar({ id: "inexistente", estado: "RESUELTA" }),
    ).rejects.toBeInstanceOf(ErrorAlertaSeguimientoNoEncontrada);
  });
});
