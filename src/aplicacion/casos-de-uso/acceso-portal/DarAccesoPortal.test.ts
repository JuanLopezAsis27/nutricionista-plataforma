import { describe, it, expect, vi } from "vitest";
import { DarAccesoPortal } from "./DarAccesoPortal";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  mockHasheador,
  pacienteEjemplo,
  usuarioEjemplo,
} from "../_ayudas-test";

function armar({
  email = "ana@mail.com",
  usuarios = mockUsuarioRepositorio(),
  cuentas = mockCuentaPacienteRepositorio(),
}: {
  email?: string | null;
  usuarios?: ReturnType<typeof mockUsuarioRepositorio>;
  cuentas?: ReturnType<typeof mockCuentaPacienteRepositorio>;
} = {}) {
  const pacientes = mockPacienteRepositorio({
    obtenerPorId: vi.fn(async () => pacienteEjemplo({ email }, "pac-1")),
  });
  return {
    caso: new DarAccesoPortal(pacientes, usuarios, cuentas, mockHasheador()),
    usuarios,
    cuentas,
  };
}

const creada = (usuarios: ReturnType<typeof mockUsuarioRepositorio>) =>
  vi.mocked(usuarios.crear).mock.calls[0]![0];

describe("DarAccesoPortal", () => {
  it("con el email libre, la cuenta entra con él", async () => {
    const { caso, usuarios } = armar();

    const resultado = await caso.ejecutar("pac-1", { password: "secreta123" });

    expect(resultado.tipo).toBe("CUENTA_NUEVA");
    expect(creada(usuarios).email).toBe("ana@mail.com");
    expect(creada(usuarios).nombreUsuario).toBeNull();
  });

  it("la cuenta nueva es de paciente, sin consultorio y con contraseña provisional", async () => {
    const { caso, usuarios } = armar();

    await caso.ejecutar("pac-1", { password: "secreta123" });

    expect(creada(usuarios).rol).toBe("PACIENTE");
    expect(creada(usuarios).nutricionistaId).toBeNull();
    expect(creada(usuarios).passwordProvisional).toBe(true);
  });

  it("sin email, entra con el nombre de usuario (normalizado)", async () => {
    const { caso, usuarios } = armar({ email: null });

    await caso.ejecutar("pac-1", {
      nombreUsuario: "  Juan.Perez ",
      password: "secreta123",
    });

    expect(creada(usuarios).email).toBeNull();
    expect(creada(usuarios).nombreUsuario).toBe("juan.perez");
  });

  it("sin email y sin usuario, no hay con qué entrar", async () => {
    const { caso, usuarios } = armar({ email: null });

    await expect(
      caso.ejecutar("pac-1", { password: "secreta123" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(usuarios.crear).not.toHaveBeenCalled();
  });

  it("rechaza un nombre de usuario tomado", async () => {
    const { caso, usuarios } = armar({
      usuarios: mockUsuarioRepositorio({
        nombreUsuarioYaRegistrado: vi.fn(async () => true),
      }),
    });

    await expect(
      caso.ejecutar("pac-1", {
        nombreUsuario: "juan.perez",
        password: "secreta123",
      }),
    ).rejects.toThrow(/ya está en uso/);
    expect(usuarios.crear).not.toHaveBeenCalled();
  });

  it("si el email es la cuenta de un paciente de OTRO consultorio, no crea ni vincula nada", async () => {
    // Asociarla sola es lo que hacía antes, y un email mal escrito le abría
    // la ficha a otra persona. Ahora lo confirma ella con un código.
    const { caso, usuarios, cuentas } = armar({
      usuarios: mockUsuarioRepositorio({
        obtenerPorEmailGlobal: vi.fn(async () =>
          usuarioEjemplo({ email: "ana@mail.com", rol: "PACIENTE" }, "u-2"),
        ),
        obtenerPorId: vi.fn(async () => null),
      }),
    });

    const resultado = await caso.ejecutar("pac-1", { password: "secreta123" });

    expect(resultado.tipo).toBe("INVITACION");
    expect(usuarios.crear).not.toHaveBeenCalled();
    expect(cuentas.vincular).not.toHaveBeenCalled();
  });

  it("si el email es el usuario de un hermano (ficha de ESTE consultorio), pide un nombre de usuario", async () => {
    const hermano = usuarioEjemplo(
      { email: "mama@mail.com", rol: "PACIENTE" },
      "u-hermano",
    );
    const armado = () =>
      armar({
        email: "mama@mail.com",
        usuarios: mockUsuarioRepositorio({
          obtenerPorEmailGlobal: vi.fn(async () => hermano),
          // La cuenta del hermano es visible acá: tiene ficha en el consultorio.
          obtenerPorId: vi.fn(async () => hermano),
        }),
      });

    const sinUsuario = armado();
    await expect(
      sinUsuario.caso.ejecutar("pac-1", { password: "secreta123" }),
    ).rejects.toThrow(/nombre de usuario/);

    const conUsuario = armado();
    await conUsuario.caso.ejecutar("pac-1", {
      nombreUsuario: "sofi.perez",
      password: "secreta123",
    });
    // El email sigue siendo el de contacto de la ficha; la cuenta nueva entra
    // solo con el usuario.
    expect(creada(conUsuario.usuarios).email).toBeNull();
    expect(creada(conUsuario.usuarios).nombreUsuario).toBe("sofi.perez");
  });

  it("no le da una segunda cuenta a una ficha que ya tiene", async () => {
    const { caso } = armar({
      usuarios: mockUsuarioRepositorio({
        obtenerPorPacienteId: vi.fn(async () =>
          usuarioEjemplo({ rol: "PACIENTE" }),
        ),
      }),
    });

    await expect(
      caso.ejecutar("pac-1", { password: "secreta123" }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("si falla el vínculo, borra la cuenta recién creada", async () => {
    const { caso, usuarios } = armar({
      cuentas: mockCuentaPacienteRepositorio({
        vincular: vi.fn(async () => {
          throw new Error("fallo");
        }),
      }),
    });

    await expect(
      caso.ejecutar("pac-1", { password: "secreta123" }),
    ).rejects.toThrow("fallo");
    expect(usuarios.eliminar).toHaveBeenCalledWith(creada(usuarios).id);
  });
});
