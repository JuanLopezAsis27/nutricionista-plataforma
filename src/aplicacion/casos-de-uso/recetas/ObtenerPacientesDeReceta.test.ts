import { describe, it, expect, vi } from "vitest";
import { ObtenerPacientesDeReceta } from "./ObtenerPacientesDeReceta";
import {
  mockRecetaRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("ObtenerPacientesDeReceta", () => {
  it("devuelve los pacientes asignados con su nombre, ordenados", async () => {
    const repositorio = mockRecetaRepositorio({
      listarPacientesAsignados: vi.fn(async () => ["pac-1", "pac-2"]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorIds: vi.fn(async () => [
        pacienteEjemplo({ nombre: "Zoe", apellido: "Ruiz" }, "pac-1"),
        pacienteEjemplo({ nombre: "Ana", apellido: "García" }, "pac-2"),
      ]),
    });
    const casoUso = new ObtenerPacientesDeReceta(repositorio, pacientes);

    const resultado = await casoUso.ejecutar("rec-1");

    expect(resultado).toEqual([
      { id: "pac-2", nombre: "Ana García" },
      { id: "pac-1", nombre: "Zoe Ruiz" },
    ]);
    expect(pacientes.obtenerPorIds).toHaveBeenCalledWith(["pac-1", "pac-2"]);
  });
});
