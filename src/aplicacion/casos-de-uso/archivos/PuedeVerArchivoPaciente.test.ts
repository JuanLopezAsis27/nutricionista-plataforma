import { describe, it, expect, vi } from "vitest";
import { PuedeVerArchivoPaciente } from "./PuedeVerArchivoPaciente";
import { Archivo } from "@/dominio/entidades/Archivo";
import {
  mockArchivoRepositorio,
  mockRecetaRepositorio,
  mockMaterialRepositorio,
  mockAsignacionPlanRepositorio,
  mockUsuarioRepositorio,
  archivoEjemplo,
} from "../_ayudas-test";

function archivoSubidoPor(usuarioId: string): Archivo {
  return Archivo.crear(
    {
      nombreOriginal: "foto.jpg",
      mimeType: "image/jpeg",
      tamanoBytes: 1024,
      contexto: "receta",
      subidoPorId: usuarioId,
    },
    "arc-1",
  );
}

const solicitante = { usuarioId: "usu-1", pacienteId: "pac-1" };

describe("PuedeVerArchivoPaciente", () => {
  it("permite ver lo que el propio usuario subió", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-1")),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      mockRecetaRepositorio(),
      mockMaterialRepositorio(),
      mockAsignacionPlanRepositorio(),
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(true);
  });

  it("permite ver la foto de perfil de otra cuenta del consultorio", async () => {
    // Es la foto del NUTRICIONISTA en el chat del portal: no la subió el
    // paciente y no cuelga de ninguna receta, plan ni material, así que sin
    // esta regla el avatar del profesional salía 403 y quedaba en iniciales.
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-nutri")),
      obtenerDueno: vi.fn(async () => null),
    });
    const usuarios = mockUsuarioRepositorio({
      esFotoDePerfil: vi.fn(async () => true),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      mockRecetaRepositorio(),
      mockMaterialRepositorio(),
      mockAsignacionPlanRepositorio(),
      usuarios,
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(true);
  });

  it("niega un archivo huérfano ajeno que NO es foto de perfil", async () => {
    // El contrapeso del caso anterior: "sin dueño" no puede volverse sinónimo
    // de "visible". Solo pasa el que `esFotoDePerfil` reconoce.
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-nutri")),
      obtenerDueno: vi.fn(async () => null),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      mockRecetaRepositorio(),
      mockMaterialRepositorio(),
      mockAsignacionPlanRepositorio(),
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(false);
  });

  it("permite ver fotos de una receta compartida con el paciente", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-nutri")),
      obtenerDueno: vi.fn(async () => ({ recetaId: "rec-1" })),
    });
    const recetas = mockRecetaRepositorio({
      listarPacientesAsignados: vi.fn(async () => ["pac-1", "pac-2"]),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      recetas,
      mockMaterialRepositorio(),
      mockAsignacionPlanRepositorio(),
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(true);
  });

  it("niega fotos de una receta NO compartida con el paciente", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-nutri")),
      obtenerDueno: vi.fn(async () => ({ recetaId: "rec-1" })),
    });
    const recetas = mockRecetaRepositorio({
      listarPacientesAsignados: vi.fn(async () => ["pac-otro"]),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      recetas,
      mockMaterialRepositorio(),
      mockAsignacionPlanRepositorio(),
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(false);
  });

  it("permite ver el archivo de un material compartido con el paciente", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-nutri")),
      obtenerDueno: vi.fn(async () => ({ materialId: "mat-1" })),
    });
    const materiales = mockMaterialRepositorio({
      listarPacientesAsignados: vi.fn(async () => ["pac-1"]),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      mockRecetaRepositorio(),
      materiales,
      mockAsignacionPlanRepositorio(),
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(true);
  });

  it("niega archivos ajenos sin dueño visible para el paciente", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoEjemplo()),
      obtenerDueno: vi.fn(async () => ({ laboratorioId: "lab-1" })),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      mockRecetaRepositorio(),
      mockMaterialRepositorio(),
      mockAsignacionPlanRepositorio(),
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(false);
  });

  it("permite ver el PDF del plan que el paciente tiene asignado hoy", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-nutri")),
      obtenerDueno: vi.fn(async () => ({ planId: "plan-1" })),
    });
    const planes = mockAsignacionPlanRepositorio({
      obtenerAsignacionActiva: vi.fn(async () => ({
        id: "asig-1",
        planId: "plan-1",
        nombrePlan: "Plan de descenso",
        finalizadaEn: null,
        pacienteId: "pac-1",
        fechaInicio: new Date("2026-07-01"),
        fechaFin: null,
        activa: true,
      })),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      mockRecetaRepositorio(),
      mockMaterialRepositorio(),
      planes,
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(true);
  });

  it("niega el PDF de un plan que ya no es el vigente del paciente", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-nutri")),
      obtenerDueno: vi.fn(async () => ({ planId: "plan-viejo" })),
    });
    const planes = mockAsignacionPlanRepositorio({
      obtenerAsignacionActiva: vi.fn(async () => ({
        id: "asig-2",
        planId: "plan-nuevo",
        nombrePlan: "Plan nuevo",
        finalizadaEn: null,
        pacienteId: "pac-1",
        fechaInicio: new Date("2026-07-01"),
        fechaFin: null,
        activa: true,
      })),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      mockRecetaRepositorio(),
      mockMaterialRepositorio(),
      planes,
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(false);
  });

  it("niega el PDF de un plan si el paciente no tiene plan asignado", async () => {
    const archivos = mockArchivoRepositorio({
      obtenerPorId: vi.fn(async () => archivoSubidoPor("usu-nutri")),
      obtenerDueno: vi.fn(async () => ({ planId: "plan-1" })),
    });
    const casoUso = new PuedeVerArchivoPaciente(
      archivos,
      mockRecetaRepositorio(),
      mockMaterialRepositorio(),
      mockAsignacionPlanRepositorio(),
      mockUsuarioRepositorio(),
    );

    expect(await casoUso.ejecutar("arc-1", solicitante)).toBe(false);
  });
});
