import { describe, it, expect, vi } from "vitest";
import {
  CrearPaciente,
  type DatosNuevoPacienteConAcceso,
} from "./CrearPaciente";
import { Paciente } from "@/dominio/entidades/Paciente";
import type { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPacienteRepositorio,
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  mockHasheador,
  pacienteEjemplo,
  usuarioEjemplo,
  mockConfiguracionRepositorio,
} from "../_ayudas-test";

const datos: DatosNuevoPacienteConAcceso = {
  nombre: "Ana",
  apellido: "García",
  email: "ana@mail.com",
  telefono: null,
  fechaNacimiento: null,
  notas: null,
  password: "secreta123",
};

function armar({
  pacientes = mockPacienteRepositorio(),
  usuarios = mockUsuarioRepositorio(),
  cuentas = mockCuentaPacienteRepositorio(),
  hasheador = mockHasheador(),
} = {}) {
  return {
    caso: new CrearPaciente(
      pacientes,
      usuarios,
      cuentas,
      hasheador,
      mockConfiguracionRepositorio(),
    ),
    pacientes,
    usuarios,
    cuentas,
    hasheador,
  };
}

describe("CrearPaciente", () => {
  it("crea el paciente y su cuenta, y se la asigna, cuando el email es nuevo", async () => {
    const { caso, pacientes, usuarios, cuentas, hasheador } = armar();

    const { paciente, cuentaExistente } = await caso.ejecutar(datos);

    expect(paciente).toBeInstanceOf(Paciente);
    expect(cuentaExistente).toBe(false);
    expect(pacientes.crear).toHaveBeenCalledOnce();
    expect(hasheador.hashear).toHaveBeenCalledWith("secreta123");
    expect(usuarios.crear).toHaveBeenCalledOnce();
    const cuenta = vi.mocked(usuarios.crear).mock.calls[0]![0];
    expect(cuentas.vincular).toHaveBeenCalledWith(cuenta.id, paciente.id);
  });

  it("la cuenta nueva es de paciente, sin consultorio propio y con contraseña provisional", async () => {
    // La eligió el profesional: el portal le recomienda cambiarla.
    const { caso, usuarios } = armar();

    await caso.ejecutar(datos);

    const cuenta: Usuario = vi.mocked(usuarios.crear).mock.calls[0]![0];
    expect(cuenta.rol).toBe("PACIENTE");
    expect(cuenta.nutricionistaId).toBeNull();
    expect(cuenta.passwordProvisional).toBe(true);
  });

  it("lanza ErrorValidacion si ya existe un paciente con ese email", async () => {
    const { caso, pacientes, usuarios } = armar({
      pacientes: mockPacienteRepositorio({
        obtenerPorEmail: vi.fn(async () => pacienteEjemplo({}, "existente")),
      }),
    });

    await expect(caso.ejecutar(datos)).rejects.toBeInstanceOf(ErrorValidacion);
    expect(pacientes.crear).not.toHaveBeenCalled();
    expect(usuarios.crear).not.toHaveBeenCalled();
  });

  it("compensa eliminando el paciente si falla la creación de la cuenta", async () => {
    const { caso, pacientes } = armar({
      usuarios: mockUsuarioRepositorio({
        crear: vi.fn(async () => {
          throw new Error("fallo al crear usuario");
        }),
      }),
    });

    await expect(caso.ejecutar(datos)).rejects.toThrow();
    expect(pacientes.eliminar).toHaveBeenCalledOnce();
  });

  it("si falla el vínculo, borra la ficha y la cuenta recién creada", async () => {
    // Una cuenta sin ficha no le sirve a nadie y deja el email tomado.
    const { caso, pacientes, usuarios } = armar({
      cuentas: mockCuentaPacienteRepositorio({
        vincular: vi.fn(async () => {
          throw new Error("fallo al vincular");
        }),
      }),
    });

    await expect(caso.ejecutar(datos)).rejects.toThrow();
    const cuenta = vi.mocked(usuarios.crear).mock.calls[0]![0];
    expect(usuarios.eliminar).toHaveBeenCalledWith(cuenta.id);
    expect(pacientes.eliminar).toHaveBeenCalledOnce();
  });
});

describe("CrearPaciente — paciente de otro consultorio (una cuenta, varios consultorios)", () => {
  const cuentaDeOtroConsultorio = usuarioEjemplo(
    { email: "ana@mail.com", rol: "PACIENTE", passwordHash: "hash:suya" },
    "usr-ana",
  );

  it("vincula la cuenta que ya existe en vez de rechazar el alta", async () => {
    const { caso, usuarios, cuentas } = armar({
      usuarios: mockUsuarioRepositorio({
        obtenerPorEmailGlobal: vi.fn(async () => cuentaDeOtroConsultorio),
      }),
    });

    const { paciente, cuentaExistente } = await caso.ejecutar(datos);

    expect(cuentaExistente).toBe(true);
    expect(usuarios.crear).not.toHaveBeenCalled();
    expect(cuentas.vincular).toHaveBeenCalledWith("usr-ana", paciente.id);
  });

  it("no toca la contraseña de la cuenta que ya existía", async () => {
    // Si este consultorio pudiera fijarla, podría entrar como el paciente y
    // leer los datos del otro.
    const { caso, usuarios, hasheador } = armar({
      usuarios: mockUsuarioRepositorio({
        obtenerPorEmailGlobal: vi.fn(async () => cuentaDeOtroConsultorio),
      }),
    });

    await caso.ejecutar(datos);

    expect(hasheador.hashear).not.toHaveBeenCalled();
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("si el email es de una cuenta de profesional, rechaza sin crear nada", async () => {
    const { caso, pacientes } = armar({
      usuarios: mockUsuarioRepositorio({
        obtenerPorEmailGlobal: vi.fn(async () =>
          usuarioEjemplo({ email: "ana@mail.com" }, "nutri-2"),
        ),
      }),
    });

    await caso.ejecutar(datos).then(
      () => expect.unreachable("tenía que rechazar el alta"),
      (error: Error) => {
        expect(error).toBeInstanceOf(ErrorValidacion);
        expect(error.message).toContain("ya tiene una cuenta en la plataforma");
        // Y NO dice de quién es: sería filtrar datos de otro consultorio.
        expect(error.message).not.toMatch(/consultorio de|pertenece a/i);
      },
    );
    // Se corta ANTES de escribir: si no, habría que compensar borrándolo.
    expect(pacientes.crear).not.toHaveBeenCalled();
  });

  it("si el email ya es de una cuenta de ESTE consultorio, lo dice", async () => {
    const { caso } = armar({
      usuarios: mockUsuarioRepositorio({
        obtenerPorEmail: vi.fn(async () => usuarioEjemplo()),
      }),
    });

    await expect(caso.ejecutar(datos)).rejects.toThrow(
      "ya está usado por otra cuenta de este consultorio",
    );
  });

  it("si ya hay un paciente con ese email, lo nombra", async () => {
    // El mensaje tiene que decir CON QUIÉN choca: sin eso el profesional no
    // sabe si es la misma persona (y tiene que editarla) o un homónimo.
    const { caso } = armar({
      pacientes: mockPacienteRepositorio({
        obtenerPorEmail: vi.fn(async () => pacienteEjemplo()),
      }),
    });

    await caso.ejecutar(datos).then(
      () => expect.unreachable("tenía que rechazar el alta"),
      (error: Error) => {
        expect(error.message).toContain("ana@mail.com");
        expect(error.message).toContain("editá su ficha");
      },
    );
  });
});
