import { describe, it, expect, vi } from "vitest";
import { ObtenerContraparteDelHilo } from "./ObtenerContraparteDelHilo";
import {
  mockUsuarioRepositorio,
  mockPacienteRepositorio,
  mockNutricionistaRepositorio,
  mockNutricionistaConNombre,
  usuarioEjemplo,
  pacienteEjemplo,
} from "../_ayudas-test";

describe("ObtenerContraparteDelHilo", () => {
  it("para el NUTRICIONISTA, la contraparte es el paciente con su foto", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const usuarios = mockUsuarioRepositorio({
      obtenerPorPacienteId: vi.fn(async () =>
        usuarioEjemplo({ rol: "PACIENTE" }).cambiarFotoPerfil("arc-pac"),
      ),
    });
    const caso = new ObtenerContraparteDelHilo(
      usuarios,
      pacientes,
      mockNutricionistaRepositorio(),
    );

    expect(await caso.ejecutar("pac-1", true)).toEqual({
      nombre: "Ana García",
      fotoArchivoId: "arc-pac",
    });
  });

  it("para el PACIENTE, la contraparte es su nutricionista con su foto", async () => {
    const usuarios = mockUsuarioRepositorio({
      listarPorRol: vi.fn(async () => [
        usuarioEjemplo().cambiarFotoPerfil("arc-nutri"),
      ]),
    });
    const caso = new ObtenerContraparteDelHilo(
      usuarios,
      mockPacienteRepositorio(),
      mockNutricionistaConNombre("Lic. Marta Ruiz"),
    );

    expect(await caso.ejecutar("pac-1", false)).toEqual({
      nombre: "Lic. Marta Ruiz",
      fotoArchivoId: "arc-nutri",
    });
  });

  it("un paciente SIN cuenta de portal va sin foto, no falla", async () => {
    // No todos los pacientes tienen usuario: la foto vive en la cuenta, así
    // que sin cuenta no hay dónde guardarla y se muestran las iniciales.
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const caso = new ObtenerContraparteDelHilo(
      mockUsuarioRepositorio(),
      pacientes,
      mockNutricionistaRepositorio(),
    );

    expect(await caso.ejecutar("pac-1", true)).toEqual({
      nombre: "Ana García",
      fotoArchivoId: null,
    });
  });
});
