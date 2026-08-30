import { describe, it, expect, vi } from "vitest";
import { GenerarAlertasDeSeguimiento } from "./GenerarAlertasDeSeguimiento";
import type { ResumenDiario } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { AlertaSeguimiento } from "@/dominio/entidades/AlertaSeguimiento";
import {
  mockAlertaSeguimientoRepositorio,
  mockPacienteRepositorio,
  mockRegistroDiarioRepositorio,
  mockAsignacionPlanRepositorio,
  mockTurnoRepositorio,
  mockReloj,
  pacienteEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";

/**
 * Resumen del diario del paciente de ejemplo. El barrido lee todos los
 * pacientes de una vez, así que los mocks devuelven el mapa completo.
 */
function resumen(datos: ResumenDiario): Map<string, ResumenDiario> {
  return new Map([["pac-1", datos]]);
}

function capturarAlertas() {
  const capturadas: AlertaSeguimiento[] = [];
  const alertas = mockAlertaSeguimientoRepositorio({
    crearSiNoExistePendiente: vi.fn(async (alerta: AlertaSeguimiento) => {
      capturadas.push(alerta);
      return true;
    }),
  });
  return { alertas, capturadas };
}

describe("GenerarAlertasDeSeguimiento", () => {
  it("genera SIN_REGISTRO_PESO y SIN_ACTIVIDAD solo con diario iniciado", async () => {
    const { alertas, capturadas } = capturarAlertas();
    const pacientes = mockPacienteRepositorio({
      listar: vi.fn(async () => [pacienteEjemplo()]),
    });
    // Diario iniciado (5 registros) pero sin peso ni actividad en la semana.
    const registros = mockRegistroDiarioRepositorio({
      resumenPorPacienteEnRango: vi.fn(async () =>
        resumen({
          totalRegistros: 5,
          registroPeso: false,
          huboActividad: false,
        }),
      ),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      registros,
      mockAsignacionPlanRepositorio(),
      mockTurnoRepositorio(),
      mockReloj(),
    );

    const resultado = await casoUso.ejecutar();

    expect(resultado.generadas).toBe(2);
    expect(capturadas.map((a) => a.tipo).sort()).toEqual([
      "SIN_ACTIVIDAD",
      "SIN_REGISTRO_PESO",
    ]);
  });

  it("no molesta a pacientes que nunca usaron el diario", async () => {
    const { alertas } = capturarAlertas();
    const pacientes = mockPacienteRepositorio({
      listar: vi.fn(async () => [pacienteEjemplo()]),
    });
    // Nunca usó el diario: no aparece en el resumen.
    const registros = mockRegistroDiarioRepositorio({
      resumenPorPacienteEnRango: vi.fn(async () => new Map()),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      registros,
      mockAsignacionPlanRepositorio(),
      mockTurnoRepositorio(),
      mockReloj(),
    );

    const resultado = await casoUso.ejecutar();
    expect(resultado.generadas).toBe(0);
  });

  it("no alerta peso/actividad cuando la semana tiene registros completos", async () => {
    const { alertas, capturadas } = capturarAlertas();
    const pacientes = mockPacienteRepositorio({
      listar: vi.fn(async () => [pacienteEjemplo()]),
    });
    const registros = mockRegistroDiarioRepositorio({
      resumenPorPacienteEnRango: vi.fn(async () =>
        resumen({
          totalRegistros: 12,
          registroPeso: true,
          huboActividad: true,
        }),
      ),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      registros,
      mockAsignacionPlanRepositorio(),
      mockTurnoRepositorio(),
      mockReloj(),
    );

    const resultado = await casoUso.ejecutar();
    expect(resultado.generadas).toBe(0);
    expect(capturadas).toHaveLength(0);
  });

  it("genera PLAN_VENCIDO con la asignación como referencia", async () => {
    const { alertas, capturadas } = capturarAlertas();
    const pacientes = mockPacienteRepositorio({
      listar: vi.fn(async () => [pacienteEjemplo()]),
    });
    const planes = mockAsignacionPlanRepositorio({
      listarAsignacionesActivasVencidas: vi.fn(async () => [
        {
          id: "asig-1",
          planId: "pla-1",
          nombrePlan: "Plan descenso",
          pacienteId: "pac-1",
          fechaInicio: new Date("2026-05-01"),
          fechaFin: new Date("2026-07-01"),
          finalizadaEn: null,
          activa: true,
        },
      ]),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      mockRegistroDiarioRepositorio(),
      planes,
      mockTurnoRepositorio(),
      mockReloj(),
    );

    const resultado = await casoUso.ejecutar();

    expect(resultado.generadas).toBe(1);
    expect(capturadas[0]!.tipo).toBe("PLAN_VENCIDO");
    expect(capturadas[0]!.referenciaId).toBe("asig-1");
  });

  it("genera TURNO_SIN_CONFIRMAR solo para turnos PENDIENTES de mañana", async () => {
    const { alertas, capturadas } = capturarAlertas();
    const pacientes = mockPacienteRepositorio({
      listar: vi.fn(async () => [pacienteEjemplo()]),
    });
    const turnos = mockTurnoRepositorio({
      obtenerEnFecha: vi.fn(async () => [turnoEjemplo()]), // nace PENDIENTE
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      mockRegistroDiarioRepositorio(),
      mockAsignacionPlanRepositorio(),
      turnos,
      mockReloj(),
    );

    const resultado = await casoUso.ejecutar();

    expect(resultado.generadas).toBe(1);
    expect(capturadas[0]!.tipo).toBe("TURNO_SIN_CONFIRMAR");
    expect(capturadas[0]!.referenciaId).toBe("tur-1");
  });

  it("no cuenta duplicados: el repositorio idempotente devuelve false", async () => {
    const alertas = mockAlertaSeguimientoRepositorio({
      crearSiNoExistePendiente: vi.fn(async () => false), // ya existía
    });
    const pacientes = mockPacienteRepositorio({
      listar: vi.fn(async () => [pacienteEjemplo()]),
    });
    const registros = mockRegistroDiarioRepositorio({
      resumenPorPacienteEnRango: vi.fn(async () =>
        resumen({
          totalRegistros: 3,
          registroPeso: false,
          huboActividad: false,
        }),
      ),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      registros,
      mockAsignacionPlanRepositorio(),
      mockTurnoRepositorio(),
      mockReloj(),
    );

    const resultado = await casoUso.ejecutar();
    expect(resultado.generadas).toBe(0);
  });
});
