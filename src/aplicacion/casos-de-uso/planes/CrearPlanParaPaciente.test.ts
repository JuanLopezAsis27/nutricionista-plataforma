import { describe, it, expect, vi } from "vitest";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import { CrearPlanParaPaciente } from "./CrearPlanParaPaciente";
import { CrearPlan } from "./CrearPlan";
import { AsignarPlanAPaciente } from "./AsignarPlanAPaciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  mockPlanRepositorio,
  mockAsignacionPlanRepositorio,
  mockGrupoPlanRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  grupoPlanEjemplo,
} from "../_ayudas-test";

function armarCasoUso(
  deps: {
    planes?: ReturnType<typeof mockPlanRepositorio>;
    asignaciones?: ReturnType<typeof mockAsignacionPlanRepositorio>;
    grupos?: ReturnType<typeof mockGrupoPlanRepositorio>;
    pacientes?: ReturnType<typeof mockPacienteRepositorio>;
  } = {},
) {
  // `AsignarPlanAPaciente` relee el plan por id después de crearlo: el mock
  // tiene que devolver el último creado, no `null` (el default), o la
  // asignación fallaría con "plan no encontrado" en todos los casos felices.
  let ultimoCreado: PlanNutricional | null = null;
  const planes =
    deps.planes ??
    mockPlanRepositorio({
      crear: vi.fn(async (p: PlanNutricional) => {
        ultimoCreado = p;
        return p;
      }),
      obtenerPorId: vi.fn(async () => ultimoCreado),
    });
  const asignaciones = deps.asignaciones ?? mockAsignacionPlanRepositorio();
  const grupos = deps.grupos ?? mockGrupoPlanRepositorio();
  const pacientes = deps.pacientes ?? mockPacienteRepositorio();

  const crearPlanUC = new CrearPlan(planes);
  const asignarUC = new AsignarPlanAPaciente(planes, asignaciones, pacientes);
  const casoUso = new CrearPlanParaPaciente(
    crearPlanUC,
    asignarUC,
    grupos,
    pacientes,
  );
  return { casoUso, planes, asignaciones, grupos, pacientes };
}

describe("CrearPlanParaPaciente", () => {
  it("crea la carpeta del paciente si no existe y guarda el plan ahí", async () => {
    const { casoUso, planes, grupos } = armarCasoUso({
      pacientes: mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
      }),
    });

    const plan = await casoUso.ejecutar({
      nombre: "Plan de Julia",
      comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "Avena" }] }],
      pacienteId: "pac-1",
      fechaInicio: new Date("2026-01-01"),
    });

    expect(grupos.existeNombre).toHaveBeenCalledWith("Ana García");
    expect(grupos.crear).toHaveBeenCalledOnce();
    expect(planes.crear).toHaveBeenCalledOnce();
    expect(plan.nombre).toBe("Plan de Julia");
  });

  it("reutiliza la carpeta del paciente si ya existe", async () => {
    const { casoUso, grupos } = armarCasoUso({
      pacientes: mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
      }),
      grupos: mockGrupoPlanRepositorio({
        obtenerPorPaciente: vi.fn(async () =>
          grupoPlanEjemplo({ nombre: "Ana García" }, "gru-1"),
        ),
      }),
    });

    await casoUso.ejecutar({
      nombre: "Plan de Julia",
      comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "Avena" }] }],
      pacienteId: "pac-1",
      fechaInicio: new Date("2026-01-01"),
    });

    expect(grupos.crear).not.toHaveBeenCalled();
  });

  it("deja el plan asignado al paciente", async () => {
    const { casoUso, asignaciones } = armarCasoUso({
      pacientes: mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo({}, "pac-1")),
      }),
    });

    await casoUso.ejecutar({
      nombre: "Plan de Julia",
      comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "Avena" }] }],
      pacienteId: "pac-1",
      fechaInicio: new Date("2026-01-01"),
    });

    expect(asignaciones.asignarAPaciente).toHaveBeenCalledOnce();
  });

  it("lanza ErrorPacienteNoEncontrado si el paciente no existe", async () => {
    const { casoUso, planes } = armarCasoUso();

    await expect(
      casoUso.ejecutar({
        nombre: "Plan",
        comidas: [{ nombre: "Desayuno", opciones: [{ contenido: "X" }] }],
        pacienteId: "pac-x",
        fechaInicio: new Date("2026-01-01"),
      }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
    expect(planes.crear).not.toHaveBeenCalled();
  });
});
