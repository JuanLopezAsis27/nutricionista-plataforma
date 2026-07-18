import { describe, it, expect, vi } from "vitest";
import { GenerarAlertasDeSeguimiento } from "./GenerarAlertasDeSeguimiento";
import { RegistroDiario } from "../../entidades/RegistroDiario";
import type { AlertaSeguimiento } from "../../entidades/AlertaSeguimiento";
import {
  mockAlertaSeguimientoRepositorio,
  mockPacienteRepositorio,
  mockRegistroDiarioRepositorio,
  mockPlanRepositorio,
  mockTurnoRepositorio,
  mockReloj,
  pacienteEjemplo,
  registroDiarioEjemplo,
  planEjemplo,
  turnoEjemplo,
} from "../_ayudas-test";

/** Registro del diario con una actividad (para la regla SIN_ACTIVIDAD). */
function registroConActividad(): RegistroDiario {
  const base = registroDiarioEjemplo().aPrimitivos();
  return RegistroDiario.reconstruir({
    ...base,
    actividades: [
      {
        id: "act-1",
        tipo: "Pesas",
        duracionMinutos: 60,
        intensidad: "ALTA",
        notas: null,
        creadoEn: new Date(),
      },
    ],
  });
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
      contarRegistros: vi.fn(async () => 5),
      listarPorRango: vi.fn(async () => []),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      registros,
      mockPlanRepositorio(),
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
    const registros = mockRegistroDiarioRepositorio({
      contarRegistros: vi.fn(async () => 0),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      registros,
      mockPlanRepositorio(),
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
      contarRegistros: vi.fn(async () => 12),
      // registroDiarioEjemplo trae pesoKg 78.5; le sumamos una actividad.
      listarPorRango: vi.fn(async () => [registroConActividad()]),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      registros,
      mockPlanRepositorio(),
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
    const planes = mockPlanRepositorio({
      listarAsignacionesActivasVencidas: vi.fn(async () => [
        {
          id: "asig-1",
          planId: "pla-1",
          pacienteId: "pac-1",
          fechaInicio: new Date("2026-05-01"),
          fechaFin: new Date("2026-07-01"),
          activa: true,
        },
      ]),
      obtenerPorId: vi.fn(async () => planEjemplo()),
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
      mockPlanRepositorio(),
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
      contarRegistros: vi.fn(async () => 3),
      listarPorRango: vi.fn(async () => []),
    });
    const casoUso = new GenerarAlertasDeSeguimiento(
      alertas,
      pacientes,
      registros,
      mockPlanRepositorio(),
      mockTurnoRepositorio(),
      mockReloj(),
    );

    const resultado = await casoUso.ejecutar();
    expect(resultado.generadas).toBe(0);
  });
});
