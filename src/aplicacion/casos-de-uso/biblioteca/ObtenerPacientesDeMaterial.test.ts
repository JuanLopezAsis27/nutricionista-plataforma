import { describe, it, expect, vi } from "vitest";
import { ObtenerPacientesDeMaterial } from "./ObtenerPacientesDeMaterial";
import {
  mockMaterialRepositorio,
  mockPacienteRepositorio,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("ObtenerPacientesDeMaterial", () => {
  it("devuelve los pacientes asignados con su nombre, ordenados", async () => {
    const repositorio = mockMaterialRepositorio({
      listarPacientesAsignados: vi.fn(async () => ["pac-1", "pac-2"]),
    });
    const pacientes = mockPacienteRepositorio({
      obtenerPorIds: vi.fn(async () => [
        pacienteEjemplo({ nombre: "Zoe", apellido: "Ruiz" }, "pac-1"),
        pacienteEjemplo({ nombre: "Ana", apellido: "García" }, "pac-2"),
      ]),
    });
    const casoUso = new ObtenerPacientesDeMaterial(repositorio, pacientes);

    const resultado = await casoUso.ejecutar("mat-1");

    expect(resultado).toEqual([
      { id: "pac-2", nombre: "Ana García" },
      { id: "pac-1", nombre: "Zoe Ruiz" },
    ]);
    expect(pacientes.obtenerPorIds).toHaveBeenCalledWith(["pac-1", "pac-2"]);
  });
});
