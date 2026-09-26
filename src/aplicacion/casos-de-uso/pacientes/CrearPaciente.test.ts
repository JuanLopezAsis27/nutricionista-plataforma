import { describe, it, expect, vi } from "vitest";
import {
  CrearPaciente,
  type DatosNuevoPacienteConAcceso,
} from "./CrearPaciente";
import { DarAccesoPortal } from "../acceso-portal/DarAccesoPortal";
import { Paciente } from "@/dominio/entidades/Paciente";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  mockHasheador,
  mockConfiguracionRepositorio,
  usuarioEjemplo,
} from "../_ayudas-test";

const datos: DatosNuevoPacienteConAcceso = {
  nombre: "Ana",
  apellido: "García",
  email: "ana@mail.com",
  telefono: null,
  fechaNacimiento: null,
  notas: null,
  acceso: { password: "secreta123" },
};

/**
 * `CrearPaciente` con el `DarAccesoPortal` real: el alta y la ficha dan el
 * acceso por el MISMO camino, y es esa composición la que se prueba. Las
 * reglas finas del acceso están en `DarAccesoPortal.test.ts`.
 */
function armar({
  usuarios = mockUsuarioRepositorio(),
  cuentas = mockCuentaPacienteRepositorio(),
} = {}) {
  const creados: Paciente[] = [];
  const pacientes = mockPacienteRepositorio({
    crear: vi.fn(async (p: Paciente) => {
      creados.push(p);
      return p;
    }),
    obtenerPorId: vi.fn(
      async (id: string) => creados.find((p) => p.id === id) ?? null,
    ),
  });
  const caso = new CrearPaciente(
    pacientes,
    mockConfiguracionRepositorio(),
    new DarAccesoPortal(pacientes, usuarios, cuentas, mockHasheador()),
  );
  return { caso, pacientes, usuarios, cuentas };
}

describe("CrearPaciente", () => {
  it("crea la ficha y la cuenta, y se la asigna", async () => {
    const { caso, pacientes, usuarios, cuentas } = armar();

    const { paciente, acceso } = await caso.ejecutar(datos);

    expect(paciente).toBeInstanceOf(Paciente);
    expect(acceso.tipo).toBe("CUENTA_NUEVA");
    expect(pacientes.crear).toHaveBeenCalledOnce();
    const cuenta = vi.mocked(usuarios.crear).mock.calls[0]![0];
    expect(cuenta.email).toBe("ana@mail.com");
    expect(cuentas.vincular).toHaveBeenCalledWith(cuenta.id, paciente.id);
  });

  it("sin acceso, crea solo la ficha (alta rápida, sin portal)", async () => {
    const { caso, usuarios } = armar();

    const { acceso } = await caso.ejecutar({
      nombre: "Juan",
      apellido: "Pérez",
      acceso: null,
    });

    expect(acceso.tipo).toBe("SIN_CUENTA");
    expect(usuarios.crear).not.toHaveBeenCalled();
  });

  it("un paciente sin email es válido", async () => {
    const { caso } = armar();

    const { paciente } = await caso.ejecutar({
      nombre: "Juan",
      apellido: "Pérez",
      email: null,
      acceso: null,
    });

    expect(paciente.email).toBeNull();
  });

  it("si el acceso falla, borra la ficha recién creada", async () => {
    // Sin email y sin usuario, no hay con qué entrar: el profesional corrige
    // y reenvía, sin una ficha a medias.
    const { caso, pacientes } = armar();

    await expect(
      caso.ejecutar({ ...datos, email: null, acceso: { password: "x" } }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    const creada = vi.mocked(pacientes.crear).mock.calls[0]![0];
    expect(pacientes.eliminar).toHaveBeenCalledWith(creada.id);
  });

  it("si el email ya es de un paciente de otro consultorio, NO lo vincula: pide invitación", async () => {
    const deOtro = usuarioEjemplo(
      { email: "ana@mail.com", rol: "PACIENTE" },
      "usr-otro",
    );
    const { caso, usuarios, cuentas } = armar({
      usuarios: mockUsuarioRepositorio({
        obtenerPorEmailGlobal: vi.fn(async () => deOtro),
        // No tiene ficha en este consultorio.
        obtenerPorId: vi.fn(async () => null),
      }),
    });

    const { acceso } = await caso.ejecutar(datos);

    expect(acceso.tipo).toBe("INVITACION");
    expect(usuarios.crear).not.toHaveBeenCalled();
    expect(cuentas.vincular).not.toHaveBeenCalled();
  });
});
