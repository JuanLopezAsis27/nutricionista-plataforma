import { describe, it, expect, vi } from "vitest";
import { ObtenerContraparteDelHilo } from "./ObtenerContraparteDelHilo";
import { NOMBRE_PROFESIONAL_POR_DEFECTO } from "@/aplicacion/casos-de-uso/perfil/identidad";
import {
  mockUsuarioRepositorio,
  mockPacienteRepositorio,
  mockConfiguracionRepositorio,
  usuarioEjemplo,
  pacienteEjemplo,
  configuracionEjemplo,
} from "../_ayudas-test";

describe("ObtenerContraparteDelHilo", () => {
  it("para el NUTRICIONISTA, la contraparte es el paciente con su foto", async () => {
    const pacientes = mockPacienteRepositorio({
      obtenerPorId: vi.fn(async () => pacienteEjemplo()),
    });
    const usuarios = mockUsuarioRepositorio({
      obtenerPorPacienteId: vi.fn(async () =>
        usuarioEjemplo({
          rol: "PACIENTE",
          pacienteId: "pac-1",
        }).cambiarFotoPerfil("arc-pac"),
      ),
    });
    const caso = new ObtenerContraparteDelHilo(
      usuarios,
      pacientes,
      mockConfiguracionRepositorio(),
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
    const configuracion = mockConfiguracionRepositorio({
      obtener: vi.fn(async () =>
        configuracionEjemplo().actualizar({
          nombreProfesional: "Lic. Marta Ruiz",
        }),
      ),
    });
    const caso = new ObtenerContraparteDelHilo(
      usuarios,
      mockPacienteRepositorio(),
      configuracion,
    );

    expect(await caso.ejecutar("pac-1", false)).toEqual({
      nombre: "Lic. Marta Ruiz",
      fotoArchivoId: "arc-nutri",
    });
  });

  it("nombra al profesional aunque el consultorio no haya cargado su nombre", async () => {
    // Un consultorio recién dado de alta no tiene `nombreProfesional`: sin
    // respaldo, el encabezado del chat del paciente quedaba vacío.
    const caso = new ObtenerContraparteDelHilo(
      mockUsuarioRepositorio(),
      mockPacienteRepositorio(),
      mockConfiguracionRepositorio(),
    );

    expect(await caso.ejecutar("pac-1", false)).toEqual({
      nombre: NOMBRE_PROFESIONAL_POR_DEFECTO,
      fotoArchivoId: null,
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
      mockConfiguracionRepositorio(),
    );

    expect(await caso.ejecutar("pac-1", true)).toEqual({
      nombre: "Ana García",
      fotoArchivoId: null,
    });
  });
});
