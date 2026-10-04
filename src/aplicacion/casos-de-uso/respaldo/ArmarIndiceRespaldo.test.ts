import { describe, it, expect, vi } from "vitest";
import { ArmarIndiceRespaldo } from "./ArmarIndiceRespaldo";
import {
  mockAsignacionPlanRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
  planEjemplo,
} from "../_ayudas-test";
import type { IUbicacionArchivosRepositorio } from "@/dominio/repositorios/IUbicacionArchivosRepositorio";

const ana = pacienteEjemplo({ nombre: "Ana", apellido: "García" }, "pac-1");
const homonima = pacienteEjemplo(
  { nombre: "Ana", apellido: "García" },
  "pac-2",
);

function armar(archivos: IUbicacionArchivosRepositorio["listar"]) {
  const listar = vi.fn(async () => [ana, homonima]);
  const caso = new ArmarIndiceRespaldo(
    mockPacienteRepositorio({ listar }),
    mockAsignacionPlanRepositorio({
      listarPlanesDePaciente: vi.fn(async (id: string) =>
        id === "pac-1" ? [planEjemplo({ nombre: "Plan base" }, "pla-1")] : [],
      ),
    }),
    { listar: vi.fn(archivos) },
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
