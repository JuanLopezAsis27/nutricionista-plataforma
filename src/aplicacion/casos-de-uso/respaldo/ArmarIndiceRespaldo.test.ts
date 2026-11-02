import { describe, it, expect, vi } from "vitest";
import { ArmarIndiceRespaldo } from "./ArmarIndiceRespaldo";
import {
  mockAsignacionPlanRepositorio,
  mockPacienteRepositorio,
  mockPlanificacionDeportivaRepositorio,
  pacienteEjemplo,
  planEjemplo,
} from "../_ayudas-test";
import type { IUbicacionArchivosRepositorio } from "@/dominio/repositorios/IUbicacionArchivosRepositorio";
import { PlanificacionDeportiva } from "@/dominio/entidades/PlanificacionDeportiva";

const ana = pacienteEjemplo({ nombre: "Ana", apellido: "García" }, "pac-1");
const homonima = pacienteEjemplo(
  { nombre: "Ana", apellido: "García" },
  "pac-2",
);

const planificacion = (nombre: string, id: string): PlanificacionDeportiva =>
  PlanificacionDeportiva.crear(
    {
      tipo: "CARRERA",
      nombre,
      carrera: {
        modalidad: "CALLE",
        distanciaKm: 21.1,
        duracionEstimadaMin: 105,
      },
    },
    id,
    () => "ing-1",
  );

const competencia = {
  id: "com-1",
  nombre: "Media de Buenos Aires",
  fecha: new Date("2026-08-23T00:00:00Z"),
  lugar: null,
};

function armar(archivos: IUbicacionArchivosRepositorio["listar"]) {
  const listar = vi.fn(async () => [ana, homonima]);
  // Una asignada a Ana para su competencia; la otra, general sin asignar.
  const planificaciones = mockPlanificacionDeportivaRepositorio([
    planificacion("Media maratón", "pd-1"),
    planificacion("Trail 30K", "pd-2"),
  ]);
  planificaciones.asignaciones.push({
    id: "apd-1",
    planificacionId: "pd-1",
    pacienteId: "pac-1",
    competenciaId: competencia.id,
    creadoEn: new Date(),
  });
  planificaciones.listarDePaciente = vi.fn(async (pacienteId: string) =>
    pacienteId === "pac-1"
      ? [
          {
            ...planificaciones.asignaciones[0]!,
            planificacion: planificaciones.planificaciones[0]!,
            competencia,
          },
        ]
      : [],
  );
  const caso = new ArmarIndiceRespaldo(
    mockPacienteRepositorio({ listar }),
    mockAsignacionPlanRepositorio({
      listarPlanesDePaciente: vi.fn(async (id: string) =>
        id === "pac-1" ? [planEjemplo({ nombre: "Plan base" }, "pla-1")] : [],
      ),
    }),
    { listar: vi.fn(archivos) },
    planificaciones,
    planificaciones,
  );
  return { caso, listar };
}

describe("ArmarIndiceRespaldo", () => {
  it("incluye a los pacientes archivados", async () => {
    const { caso, listar } = armar(async () => []);
    await caso.ejecutar();
    expect(listar).toHaveBeenCalledWith({ incluirArchivados: true });
  });

  it("da a cada paciente su carpeta, aunque se llamen igual", async () => {
    const { caso } = armar(async () => []);
    const { pacientes } = await caso.ejecutar();
    expect(pacientes.map((p) => p.carpeta)).toEqual([
      "Pacientes/García Ana",
      "Pacientes/García Ana (2)",
    ]);
    expect(pacientes[0]?.evaluacion).toBe(
      "Pacientes/García Ana/Evaluación.pdf",
    );
    expect(pacientes[0]?.planes).toEqual([
      { planId: "pla-1", ruta: "Pacientes/García Ana/Planes/Plan base.pdf" },
    ]);
  });

  it("pone las planificaciones deportivas de cada paciente en su carpeta, con su competencia", async () => {
    const { caso } = armar(async () => []);
    const { pacientes } = await caso.ejecutar();
    expect(pacientes[0]?.planificaciones).toEqual([
      {
        planificacionId: "pd-1",
        ruta: "Pacientes/García Ana/Planificaciones deportivas/Media maratón.pdf",
        competencia,
      },
    ]);
    expect(pacientes[1]?.planificaciones).toEqual([]);
  });

  it("manda a «Sin paciente» las planificaciones que no tiene nadie", async () => {
    const { caso } = armar(async () => []);
    const { planificacionesSinPaciente } = await caso.ejecutar();
    expect(planificacionesSinPaciente).toEqual([
      {
        planificacionId: "pd-2",
        ruta: "Sin paciente/Planificaciones deportivas/Trail 30K.pdf",
      },
    ]);
  });

  it("ubica cada archivo en la carpeta de su paciente o en «Sin paciente»", async () => {
    const { caso } = armar(async () => [
      {
        id: "arc-1",
        nombreOriginal: "analisis.pdf",
        ubicacion: {
          tipo: "LABORATORIO",
          pacienteId: "pac-2",
          fecha: new Date("2026-03-10T00:00:00Z"),
          titulo: "Perfil lipídico",
        },
      },
      {
        id: "arc-2",
        nombreOriginal: "logo.png",
        ubicacion: { tipo: "SIN_DUENO" },
      },
    ]);
    const { archivos } = await caso.ejecutar();
    expect(archivos).toEqual([
      {
        archivoId: "arc-1",
        ruta: "Pacientes/García Ana (2)/Laboratorios/2026-03-10 Perfil lipídico/analisis.pdf",
      },
      { archivoId: "arc-2", ruta: "Sin paciente/Otros/logo.png" },
    ]);
  });
});
