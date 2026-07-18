import { describe, it, expect, vi } from "vitest";
import { ObtenerAlertasPendientes } from "./ObtenerAlertasPendientes";
import { ContarAlertasPendientes } from "./ContarAlertasPendientes";
import {
  mockAlertaSeguimientoRepositorio,
  alertaSeguimientoEjemplo,
} from "../_ayudas-test";

describe("ObtenerAlertasPendientes / ContarAlertasPendientes", () => {
  it("lista las alertas pendientes", async () => {
    const alertas = mockAlertaSeguimientoRepositorio({
      listarPendientes: vi.fn(async () => [alertaSeguimientoEjemplo()]),
    });
    const casoUso = new ObtenerAlertasPendientes(alertas);

    const resultado = await casoUso.ejecutar();
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.estado).toBe("PENDIENTE");
  });

  it("cuenta las pendientes para la campana", async () => {
    const alertas = mockAlertaSeguimientoRepositorio({
      contarPendientes: vi.fn(async () => 4),
    });
    const casoUso = new ContarAlertasPendientes(alertas);

    expect(await casoUso.ejecutar()).toBe(4);
  });
});
