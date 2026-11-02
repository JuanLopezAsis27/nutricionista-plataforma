import { describe, it, expect, vi } from "vitest";
import {
  PlanificacionDeportiva,
  type DatosNuevaPlanificacion,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { GrupoPlan } from "@/dominio/entidades/GrupoPlan";
import { ErrorPlanificacionDuplicada } from "@/dominio/errores/ErrorPlanificacionDuplicada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorPlanificacionNoEncontrada } from "@/dominio/errores/ErrorPlanificacionNoEncontrada";
import {
  mockPlanificacionDeportivaRepositorio,
  mockGrupoPlanRepositorio,
  mockPacienteRepositorio,
  mockCompetenciaRepositorio,
  pacienteEjemplo,
  competenciaEjemplo,
} from "../_ayudas-test";
import { CrearPlanificacion } from "./CrearPlanificacion";
import { CrearPlanificacionParaPaciente } from "./CrearPlanificacionParaPaciente";
import { AsignarPlanificacionAPaciente } from "./AsignarPlanificacionAPaciente";
import { DuplicarPlanificacion } from "./DuplicarPlanificacion";
import { ActualizarPlanificacion } from "./ActualizarPlanificacion";
import { DesasignarPlanificacionDePaciente } from "./DesasignarPlanificacionDePaciente";
import { ListarPlanificaciones } from "./ListarPlanificaciones";

/**
 * Casos de uso de la planificación deportiva (migración 94): el nombre que no
 * se repite, la carpeta del paciente que se arma sola, la competencia que
 * tiene que ser DEL paciente y la asignación que no se duplica.
 */

const datos = (nombre = "Media maratón"): DatosNuevaPlanificacion => ({
  tipo: "CARRERA",
  nombre,
  carrera: { modalidad: "CALLE", distanciaKm: 21.1, duracionEstimadaMin: 105 },
  ingestas: [
    { minuto: 40, alimentos: [{ nombre: "Gel", cantidadGramos: 40 }] },
  ],
});

function armar(opciones: { pacienteExiste?: boolean } = {}) {
  const planificaciones = mockPlanificacionDeportivaRepositorio();
  const carpetas: GrupoPlan[] = [];
  const grupos = mockGrupoPlanRepositorio({
    crear: vi.fn(async (g: GrupoPlan) => {
      carpetas.push(g);
      return g;
    }),
    obtenerPorId: vi.fn(
      async (id: string) => carpetas.find((g) => g.id === id) ?? null,
    ),
    obtenerPorPaciente: vi.fn(
      async (id: string) => carpetas.find((g) => g.pacienteId === id) ?? null,
    ),
  });
  const pacientes = mockPacienteRepositorio({
    obtenerPorId: vi.fn(async (id: string) =>
      opciones.pacienteExiste === false ? null : pacienteEjemplo({}, id),
    ),
  });
  const competencias = mockCompetenciaRepositorio({
    obtenerPorId: vi.fn(async (id: string) =>
      id === "com-de-otro"
        ? competenciaEjemplo({ pacienteId: "pac-2" }, id)
        : competenciaEjemplo({ pacienteId: "pac-1" }, id),
    ),
  });
  const crear = new CrearPlanificacion(planificaciones, grupos);
  const asignar = new AsignarPlanificacionAPaciente(
    planificaciones,
    planificaciones,
    pacientes,
    competencias,
  );
  const paraPaciente = new CrearPlanificacionParaPaciente(
    crear,
    asignar,
    grupos,
    pacientes,
    competencias,
  );
  return { planificaciones, carpetas, crear, asignar, paraPaciente };
}

describe("CrearPlanificacion", () => {
  it("no repite el nombre (sin distinguir mayúsculas)", async () => {
    const { crear } = armar();
    await crear.ejecutar(datos("Media maratón"));
    await expect(crear.ejecutar(datos("media MARATÓN"))).rejects.toBeInstanceOf(
      ErrorPlanificacionDuplicada,
    );
  });
});

describe("CrearPlanificacionParaPaciente", () => {
  it("la guarda en la carpeta del paciente y se la asigna con su competencia", async () => {
    const { paraPaciente, planificaciones, carpetas } = armar();
    const creada = await paraPaciente.ejecutar({
      ...datos(),
      pacienteId: "pac-1",
      competenciaId: "com-1",
    });
    expect(carpetas).toHaveLength(1);
    expect(carpetas[0]!.pacienteId).toBe("pac-1");
    expect(carpetas[0]!.nombre).toBe("Ana García");
    expect(creada.grupoId).toBe(carpetas[0]!.id);
    expect(planificaciones.asignaciones).toEqual([
      expect.objectContaining({
        planificacionId: creada.id,
        pacienteId: "pac-1",
        competenciaId: "com-1",
      }),
    ]);
  });

  it("la segunda va a la MISMA carpeta", async () => {
    const { paraPaciente, carpetas } = armar();
    await paraPaciente.ejecutar({ ...datos("Una"), pacienteId: "pac-1" });
    const segunda = await paraPaciente.ejecutar({
      ...datos("Otra"),
      pacienteId: "pac-1",
    });
    expect(carpetas).toHaveLength(1);
    expect(segunda.grupoId).toBe(carpetas[0]!.id);
  });

  it("rechaza la competencia de otro paciente ANTES de crear nada", async () => {
    const { paraPaciente, planificaciones, carpetas } = armar();
    await expect(
      paraPaciente.ejecutar({
        ...datos(),
        pacienteId: "pac-1",
        competenciaId: "com-de-otro",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(planificaciones.planificaciones).toHaveLength(0);
    expect(carpetas).toHaveLength(0);
  });

  it("falla si el paciente no existe", async () => {
    const { paraPaciente } = armar({ pacienteExiste: false });
    await expect(
      paraPaciente.ejecutar({ ...datos(), pacienteId: "pac-9" }),
    ).rejects.toBeInstanceOf(ErrorPacienteNoEncontrado);
  });
});

describe("AsignarPlanificacionAPaciente", () => {
  it("asignar dos veces no la duplica: cambia la competencia y conserva el vínculo", async () => {
    const { crear, asignar, planificaciones } = armar();
    const p = await crear.ejecutar(datos());
    const primera = await asignar.ejecutar({
      planificacionId: p.id,
      pacienteId: "pac-1",
    });
    const segunda = await asignar.ejecutar({
      planificacionId: p.id,
      pacienteId: "pac-1",
      competenciaId: "com-1",
    });
    expect(planificaciones.asignaciones).toHaveLength(1);
    expect(segunda.id).toBe(primera.id);
    expect(segunda.competenciaId).toBe("com-1");
  });
});

describe("DuplicarPlanificacion", () => {
  it("numera el nombre de la copia y no copia las asignaciones", async () => {
    const { crear, asignar, planificaciones } = armar();
    const original = await crear.ejecutar(datos("Trail 30K"));
    await asignar.ejecutar({
      planificacionId: original.id,
      pacienteId: "pac-1",
    });
    const duplicar = new DuplicarPlanificacion(planificaciones);

    const copia = await duplicar.ejecutar(original.id);
    const otra = await duplicar.ejecutar(original.id);

    expect(copia.nombre).toBe("Trail 30K (copia)");
    expect(otra.nombre).toBe("Trail 30K (copia 2)");
    expect(copia.ingestas).toHaveLength(1);
    expect(
      planificaciones.asignaciones.filter(
        (a) => a.planificacionId === copia.id,
      ),
    ).toHaveLength(0);
  });
});

describe("ActualizarPlanificacion", () => {
  it("puede guardarse con su propio nombre, pero no con el de otra", async () => {
    const { crear, planificaciones } = armar();
    const una = await crear.ejecutar(datos("Una"));
    await crear.ejecutar(datos("Otra"));
    const actualizar = new ActualizarPlanificacion(planificaciones);

    await expect(
      actualizar.ejecutar(una.id, { ...datos("Una"), descripcion: "nueva" }),
    ).resolves.toBeInstanceOf(PlanificacionDeportiva);
    await expect(
      actualizar.ejecutar(una.id, datos("Otra")),
    ).rejects.toBeInstanceOf(ErrorPlanificacionDuplicada);
  });
});

describe("DesasignarPlanificacionDePaciente", () => {
  it("borra el vínculo, y avisa si no lo tenía", async () => {
    const { crear, asignar, planificaciones } = armar();
    const p = await crear.ejecutar(datos());
    await asignar.ejecutar({ planificacionId: p.id, pacienteId: "pac-1" });
    const desasignar = new DesasignarPlanificacionDePaciente(planificaciones);

    await desasignar.ejecutar(p.id, "pac-1");
    expect(planificaciones.asignaciones).toHaveLength(0);
    await expect(desasignar.ejecutar(p.id, "pac-1")).rejects.toBeInstanceOf(
      ErrorPlanificacionNoEncontrada,
    );
  });
});

describe("ListarPlanificaciones", () => {
  it("dice a cuántos pacientes está asignada cada una", async () => {
    const { crear, asignar, planificaciones } = armar();
    const p = await crear.ejecutar(datos("Con pacientes"));
    await crear.ejecutar(datos("Sin pacientes"));
    await asignar.ejecutar({ planificacionId: p.id, pacienteId: "pac-1" });
    await asignar.ejecutar({ planificacionId: p.id, pacienteId: "pac-2" });

    const pagina = await new ListarPlanificaciones(
      planificaciones,
      planificaciones,
    ).ejecutar({ pagina: 1, porPagina: 20 });
    const cantidades = Object.fromEntries(
      pagina.items.map((i) => [i.planificacion.nombre, i.cantidadPacientes]),
    );
    expect(cantidades).toEqual({ "Con pacientes": 2, "Sin pacientes": 0 });
  });
});

describe("revisión: versión, nombres agotados y conteo", () => {
  it("editar manda la versión que leyó el formulario hasta el repositorio", async () => {
    const { crear, planificaciones } = armar();
    const p = await crear.ejecutar(datos("Con versión"));
    const version = new Date("2026-10-24T12:00:00.000Z");
    await new ActualizarPlanificacion(planificaciones).ejecutar(
      p.id,
      datos("Con versión"),
      version,
    );
    expect(planificaciones.actualizar).toHaveBeenCalledWith(
      expect.any(PlanificacionDeportiva),
      version,
    );
  });

  it("si se agotan los nombres de copia, avisa en vez de chocar contra la base", async () => {
    const { crear, planificaciones } = armar();
    const original = await crear.ejecutar(datos("Trail"));
    planificaciones.existeNombre = vi.fn(async () => true);
    await expect(
      new DuplicarPlanificacion(planificaciones).ejecutar(original.id),
    ).rejects.toBeInstanceOf(ErrorPlanificacionDuplicada);
    expect(planificaciones.crear).toHaveBeenCalledTimes(1);
  });
});
