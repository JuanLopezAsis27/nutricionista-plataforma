import { describe, it, expect, vi } from "vitest";
import { ObtenerAlertasAlimentarias } from "./ObtenerAlertasAlimentarias";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockAlertaAlimentariaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  alertaAlimentariaEjemplo,
} from "../_ayudas-test";

describe("ObtenerAlertasAlimentarias", () => {
  it("devuelve las alertas del paciente", async () => {
    const casoUso = new ObtenerAlertasAlimentarias(
      mockAlertaAlimentariaRepositorio({
        listarPorPaciente: vi.fn(async () => [alertaAlimentariaEjemplo()]),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
    );

    const alertas = await casoUso.ejecutar("pac-1");

    expect(alertas).toHaveLength(1);
    expect(alertas[0]?.descripcion).toBe("Lactosa");
  });

  it("rechaza si el paciente no existe", async () => {
    const casoUso = new ObtenerAlertasAlimentarias(
      mockAlertaAlimentariaRepositorio(),
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar("no-existe")).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
  });
});
