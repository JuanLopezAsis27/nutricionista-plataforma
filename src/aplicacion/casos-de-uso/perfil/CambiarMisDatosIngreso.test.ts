import { describe, it, expect, vi } from "vitest";
import { CambiarMisDatosIngreso } from "./CambiarMisDatosIngreso";
import { ErrorPasswordIncorrecta } from "@/dominio/errores/ErrorPasswordIncorrecta";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockUsuarioRepositorio,
  mockHasheador,
  usuarioEjemplo,
} from "../_ayudas-test";

// `mockHasheador` verifica "hash:<plano>".
const conUsuario = usuarioEjemplo(
  {
    rol: "PACIENTE",
    email: null,
    nombreUsuario: "juan.perez",
    passwordHash: "hash:mi-clave",
  },
  "usr-1",
);

function armar(parcial: Parameters<typeof mockUsuarioRepositorio>[0] = {}) {
  const usuarios = mockUsuarioRepositorio({
    obtenerPorId: vi.fn(async () => conUsuario),
    ...parcial,
  });
  return {
    caso: new CambiarMisDatosIngreso(usuarios, mockHasheador()),
    usuarios,
  };
}

describe("CambiarMisDatosIngreso", () => {
  it("una cuenta que entraba solo con usuario se agrega un email", async () => {
    const { caso, usuarios } = armar();

    await caso.ejecutar({
      usuarioId: "usr-1",
      passwordActual: "mi-clave",
      email: " Juan@Mail.com ",
      nombreUsuario: "juan.perez",
    });

    const guardada = vi.mocked(usuarios.actualizar).mock.calls[0]![0];
    expect(guardada.email).toBe("juan@mail.com");
    expect(guardada.nombreUsuario).toBe("juan.perez");
  });

  it("exige la contraseña actual", async () => {
    const { caso, usuarios } = armar();

    await expect(
      caso.ejecutar({
        usuarioId: "usr-1",
        passwordActual: "otra",
        email: "juan@mail.com",
        nombreUsuario: "juan.perez",
      }),
    ).rejects.toBeInstanceOf(ErrorPasswordIncorrecta);
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza un email que ya usa otra cuenta", async () => {
    const { caso, usuarios } = armar({
      emailYaRegistrado: vi.fn(async () => true),
    });

    await expect(
      caso.ejecutar({
        usuarioId: "usr-1",
        passwordActual: "mi-clave",
        email: "tomado@mail.com",
        nombreUsuario: "juan.perez",
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("no se puede quedar sin nada con qué entrar", async () => {
    const { caso } = armar();

    await expect(
      caso.ejecutar({
        usuarioId: "usr-1",
        passwordActual: "mi-clave",
        email: null,
        nombreUsuario: null,
      }),
    ).rejects.toBeInstanceOf(ErrorValidacion);
  });

  it("mantener el propio usuario no choca consigo mismo", async () => {
    const { caso, usuarios } = armar({
      nombreUsuarioYaRegistrado: vi.fn(async () => true),
    });

    await caso.ejecutar({
      usuarioId: "usr-1",
      passwordActual: "mi-clave",
      email: "juan@mail.com",
      nombreUsuario: "juan.perez",
    });

    expect(usuarios.actualizar).toHaveBeenCalledOnce();
  });
});
