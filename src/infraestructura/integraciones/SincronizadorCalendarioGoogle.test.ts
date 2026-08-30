import { describe, it, expect, vi } from "vitest";
import { SincronizadorCalendarioGoogle } from "./SincronizadorCalendarioGoogle";
import type { IProveedorGoogle } from "@/dominio/servicios/IProveedorGoogle";
import type { ISincronizacionTurnoRepositorio } from "@/dominio/repositorios/ISincronizacionTurnoRepositorio";
import type { DatosTurnoSync } from "@/dominio/servicios/ISincronizadorCalendario";
import {
  mockCuentaConectadaRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRecordatoriosRepositorio,
  cuentaConectadaEjemplo,
  pacienteEjemplo,
} from "@/aplicacion/casos-de-uso/_ayudas-test";

function proveedorMock(
  parcial: Partial<IProveedorGoogle> = {},
): IProveedorGoogle {
  return {
    urlConsentimiento: vi.fn(() => "url"),
    intercambiarCodigo: vi.fn(async () => ({
      accessToken: "a",
      refreshToken: null,
      expiraEn: null,
      emailCuenta: "x@gmail.com",
      scopes: [],
    })),
    refrescarAccessToken: vi.fn(async () => ({
      accessToken: "a2",
      expiraEn: null,
    })),
    crearEvento: vi.fn(async () => "ev-1"),
    actualizarEvento: vi.fn(async () => {}),
    eliminarEvento: vi.fn(async () => {}),
    enviarEmail: vi.fn(async () => {}),
    ...parcial,
  };
}

function syncRepoMock(
  parcial: Partial<ISincronizacionTurnoRepositorio> = {},
): ISincronizacionTurnoRepositorio {
  return {
    obtenerPorTurno: vi.fn(async () => null),
    guardar: vi.fn(async () => {}),
    eliminarPorTurno: vi.fn(async () => {}),
    ...parcial,
  };
}

const turno: DatosTurnoSync = {
  id: "tur-1",
  pacienteId: "pac-1",
  fecha: new Date("2026-08-10T00:00:00Z"),
  hora: "10:00",
  duracionMinutos: 30,
};

describe("SincronizadorCalendarioGoogle", () => {
  it("al agendar con cuenta conectada crea el evento y guarda el mapeo", async () => {
    const crearEvento = vi.fn(async () => "ev-99");
    const guardar = vi.fn(async () => {});
    const sinc = new SincronizadorCalendarioGoogle(
      mockCuentaConectadaRepositorio({
        obtener: vi.fn(async () => cuentaConectadaEjemplo()),
      }),
      syncRepoMock({ guardar }),
      proveedorMock({ crearEvento }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      mockConfiguracionRecordatoriosRepositorio(),
    );

    await sinc.alAgendar(turno);

    expect(crearEvento).toHaveBeenCalledOnce();
    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({ turnoId: "tur-1", googleEventId: "ev-99" }),
    );
  });

  it("sin cuenta conectada es no-op (no toca Google)", async () => {
    const crearEvento = vi.fn(async () => "ev-1");
    const sinc = new SincronizadorCalendarioGoogle(
      mockCuentaConectadaRepositorio({ obtener: vi.fn(async () => null) }),
      syncRepoMock(),
      proveedorMock({ crearEvento }),
      mockPacienteRepositorio(),
      mockConfiguracionRecordatoriosRepositorio(),
    );

    await sinc.alAgendar(turno);

    expect(crearEvento).not.toHaveBeenCalled();
  });

  it("al cancelar con mapeo existente elimina el evento y el mapeo", async () => {
    const eliminarEvento = vi.fn(async () => {});
    const eliminarPorTurno = vi.fn(async () => {});
    const sinc = new SincronizadorCalendarioGoogle(
      mockCuentaConectadaRepositorio({
        obtener: vi.fn(async () => cuentaConectadaEjemplo()),
      }),
      syncRepoMock({
        obtenerPorTurno: vi.fn(async () => ({
          cuentaId: "cta-1",
          turnoId: "tur-1",
          googleEventId: "ev-1",
        })),
        eliminarPorTurno,
      }),
      proveedorMock({ eliminarEvento }),
      mockPacienteRepositorio(),
      mockConfiguracionRecordatoriosRepositorio(),
    );

    await sinc.alCancelar("tur-1");

    expect(eliminarEvento).toHaveBeenCalledWith(expect.any(String), "ev-1");
    expect(eliminarPorTurno).toHaveBeenCalledWith("tur-1");
  });

  it("es best-effort: si Google falla, no propaga el error", async () => {
    const sinc = new SincronizadorCalendarioGoogle(
      mockCuentaConectadaRepositorio({
        obtener: vi.fn(async () => cuentaConectadaEjemplo()),
      }),
      syncRepoMock(),
      proveedorMock({
        crearEvento: vi.fn(async () => {
          throw new Error("Google 500");
        }),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      mockConfiguracionRecordatoriosRepositorio(),
    );

    await expect(sinc.alAgendar(turno)).resolves.toBeUndefined();
  });
});
