import { describe, it, expect, vi } from "vitest";
import { RevisarEmailPaciente } from "./RevisarEmailPaciente";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  pacienteEjemplo,
  usuarioEjemplo,
} from "../_ayudas-test";

const sofia = pacienteEjemplo(
  { nombre: "Sofía", apellido: "Pérez" },
  "pac-sofia",
);
const cuentaDeSofia = usuarioEjemplo(
  { rol: "PACIENTE", email: "mama@mail.com" },
  "usr-sofia",
);

describe("RevisarEmailPaciente", () => {
  it("un email libre: nadie lo tiene y sirve para entrar", async () => {
    const caso = new RevisarEmailPaciente(
      mockPacienteRepositorio(),
      mockUsuarioRepositorio(),
      mockCuentaPacienteRepositorio(),
    );

    expect(await caso.ejecutar("nuevo@mail.com")).toEqual({
      otrasFichas: [],
      esIngresoDeOtraCuenta: false,
      ingresoDe: null,
    });
  });

  it("el de la madre: lo tiene la ficha del hermano y ya es su ingreso, y dice de quién", async () => {
    const pacientes = mockPacienteRepositorio({
      listarPorEmail: vi.fn(async () => [sofia]),
      // Solo la ficha de este consultorio se puede leer; la de otro no.
      obtenerPorId: vi.fn(async (id: string) =>
        id === "pac-sofia" ? sofia : null,
      ),
    });
    const caso = new RevisarEmailPaciente(
      pacientes,
      mockUsuarioRepositorio({
        obtenerPorEmail: vi.fn(async () => cuentaDeSofia),
      }),
      mockCuentaPacienteRepositorio({
        listarDeUsuario: vi.fn(async () => [
          {
            pacienteId: "pac-de-otro-consultorio",
            nutricionistaId: "otro",
            nombreProfesional: "Otra Lic.",
            fotoProfesionalId: null,
          },
          {
            pacienteId: "pac-sofia",
            nutricionistaId: "este",
            nombreProfesional: "Lic.",
            fotoProfesionalId: null,
          },
        ]),
      }),
    );

    const revision = await caso.ejecutar(" MAMA@mail.com ");

    expect(pacientes.listarPorEmail).toHaveBeenCalledWith("mama@mail.com");
    expect(revision).toEqual({
      otrasFichas: [{ pacienteId: "pac-sofia", nombre: "Sofía Pérez" }],
      esIngresoDeOtraCuenta: true,
      ingresoDe: "Sofía Pérez",
    });
  });

  it("al editar, la propia ficha y su propia cuenta no cuentan", async () => {
    const caso = new RevisarEmailPaciente(
      mockPacienteRepositorio({
        listarPorEmail: vi.fn(async () => [sofia]),
      }),
      mockUsuarioRepositorio({
        obtenerPorEmail: vi.fn(async () => cuentaDeSofia),
        obtenerPorPacienteId: vi.fn(async () => cuentaDeSofia),
      }),
      mockCuentaPacienteRepositorio(),
    );

    expect(await caso.ejecutar("mama@mail.com", "pac-sofia")).toEqual({
      otrasFichas: [],
      esIngresoDeOtraCuenta: false,
      ingresoDe: null,
    });
  });
});
