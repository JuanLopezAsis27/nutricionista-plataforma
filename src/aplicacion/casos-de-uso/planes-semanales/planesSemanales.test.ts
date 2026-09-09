import { describe, it, expect, vi } from "vitest";
import { CrearPlanSemanal } from "./CrearPlanSemanal";
import { EliminarPlanSemanal } from "./EliminarPlanSemanal";
import { AsignarPlanSemanalAPaciente } from "./AsignarPlanSemanalAPaciente";
import { ObtenerPlanSemanalDelPaciente } from "./ObtenerPlanSemanalDelPaciente";
import { ErrorPlanSemanalDuplicado } from "@/dominio/errores/ErrorPlanSemanalDuplicado";
import { ErrorPlanSemanalNoEncontrado } from "@/dominio/errores/ErrorPlanSemanalNoEncontrado";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPlanSemanalRepositorio,
  mockAsignacionPlanSemanalRepositorio,
  mockAsignacionPlanRepositorio,
  mockPacienteRepositorio,
  planSemanalEjemplo,
  planEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

const datosPlan = {
  nombre: "Semana tipo",
  franjas: [
    {
      nombre: "Almuerzo",
      comidas: [{ dia: "LUNES" as const, descripcion: "Carne con verduras" }],
    },
  ],
};

describe("CrearPlanSemanal", () => {
  it("rechaza un nombre repetido con un error entendible", () => {
    // El índice único de la base es la garantía dura; este chequeo existe para
    // que el profesional lea el motivo y no un error de Prisma.
    const planes = mockPlanSemanalRepositorio({
      existeNombre: vi.fn(async () => true),
    });
    const casoUso = new CrearPlanSemanal(planes);
    return expect(casoUso.ejecutar(datosPlan)).rejects.toBeInstanceOf(
      ErrorPlanSemanalDuplicado,
    );
  });

  it("persiste el plan cuando el nombre está libre", async () => {
    const planes = mockPlanSemanalRepositorio();
    const plan = await new CrearPlanSemanal(planes).ejecutar(datosPlan);
    expect(planes.crear).toHaveBeenCalledOnce();
    expect(plan.nombre).toBe("Semana tipo");
  });
});

describe("EliminarPlanSemanal", () => {
  it("no borra un plan que algún paciente está siguiendo", async () => {
    // Borrarlo dejaría al paciente sin el menú que tiene en la mano. Primero
    // se finaliza la asignación —que queda en el historial— y después se borra.
    const planes = mockPlanSemanalRepositorio({
      obtenerPorId: vi.fn(async () => planSemanalEjemplo()),
    });
    const asignaciones = mockAsignacionPlanSemanalRepositorio({
      contarAsignacionesActivasDePlan: vi.fn(async () => 1),
    });
    const casoUso = new EliminarPlanSemanal(planes, asignaciones);

    await expect(casoUso.ejecutar("sem-1")).rejects.toBeInstanceOf(
      ErrorValidacion,
    );
    expect(planes.eliminar).not.toHaveBeenCalled();
  });

  it("lanza si el plan no existe", async () => {
    const casoUso = new EliminarPlanSemanal(
      mockPlanSemanalRepositorio(),
      mockAsignacionPlanSemanalRepositorio(),
    );
    await expect(casoUso.ejecutar("sem-1")).rejects.toBeInstanceOf(
      ErrorPlanSemanalNoEncontrado,
    );
  });
});

describe("AsignarPlanSemanalAPaciente", () => {
  const datos = {
    planSemanalId: "sem-1",
    pacienteId: "pac-1",
    fechaInicio: new Date("2026-07-01"),
    fechaFin: null,
  };

  it("desactiva el anterior con la fecha de INICIO del nuevo", async () => {
    const planes = mockPlanSemanalRepositorio({
      obtenerPorId: vi.fn(async () => planSemanalEjemplo()),
    });
    const asignaciones = mockAsignacionPlanSemanalRepositorio();
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });

    const asignacion = await new AsignarPlanSemanalAPaciente(
      planes,
      asignaciones,
      pacientes,
    ).ejecutar(datos);

    // El menú viejo rigió hasta que empezó el que lo reemplaza: si se cerrara
    // con "hoy", antedatar una asignación dejaría un hueco en el historial.
    expect(asignaciones.desactivarAsignacionesDe).toHaveBeenCalledWith(
      "pac-1",
      datos.fechaInicio,
    );
    expect(asignacion.activa).toBe(true);
    // Foto del nombre: sobrevive al renombre y al borrado del plan.
    expect(asignacion.nombrePlan).toBe("Semana tipo");
  });

  it("lanza si el paciente no existe, sin tocar las asignaciones", async () => {
    const asignaciones = mockAsignacionPlanSemanalRepositorio();
    const casoUso = new AsignarPlanSemanalAPaciente(
      mockPlanSemanalRepositorio(),
      asignaciones,
      mockPacienteRepositorio(),
    );
    await expect(casoUso.ejecutar(datos)).rejects.toBeInstanceOf(
      ErrorPacienteNoEncontrado,
    );
    expect(asignaciones.desactivarAsignacionesDe).not.toHaveBeenCalled();
  });
});

describe("ObtenerPlanSemanalDelPaciente", () => {
  it("compara cada día contra las metas del PLAN NUTRICIONAL del paciente", async () => {
    const semanales = mockAsignacionPlanSemanalRepositorio({
      obtenerPlanSemanalActivoDePaciente: vi.fn(async () =>
        planSemanalEjemplo(),
      ),
    });
    // planEjemplo trae caloriasMeta: 2000.
    const planes = mockAsignacionPlanRepositorio({
      obtenerPlanActivoDePaciente: vi.fn(async () => planEjemplo()),
    });

    const resultado = await new ObtenerPlanSemanalDelPaciente(
      semanales,
      planes,
    ).ejecutar("pac-1");

    expect(resultado).not.toBeNull();
    expect(resultado!.metas?.calorias).toBe(2000);
    expect(resultado!.nombrePlanDeLasMetas).toBe("Plan descenso");
    expect(resultado!.dias).toHaveLength(7);
    // El lunes del plan de ejemplo suma bastante menos que 2000 kcal.
    const lunes = resultado!.dias.find((d) => d.dia === "LUNES")!;
    expect(lunes.comparacion.calorias.estado).toBe("POR_DEBAJO");
  });

  it("sin plan nutricional activo devuelve los totales sin metas", async () => {
    const semanales = mockAsignacionPlanSemanalRepositorio({
      obtenerPlanSemanalActivoDePaciente: vi.fn(async () =>
        planSemanalEjemplo(),
      ),
    });
    const resultado = await new ObtenerPlanSemanalDelPaciente(
      semanales,
      mockAsignacionPlanRepositorio(),
    ).ejecutar("pac-1");

    expect(resultado!.metas).toBeNull();
    expect(resultado!.nombrePlanDeLasMetas).toBeNull();
    expect(
      resultado!.dias.every(
        (d) => d.comparacion.calorias.estado === "SIN_META",
      ),
    ).toBe(true);
  });

  it("sin plan semanal activo devuelve null", async () => {
    const resultado = await new ObtenerPlanSemanalDelPaciente(
      mockAsignacionPlanSemanalRepositorio(),
      mockAsignacionPlanRepositorio(),
    ).ejecutar("pac-1");
    expect(resultado).toBeNull();
  });
});
