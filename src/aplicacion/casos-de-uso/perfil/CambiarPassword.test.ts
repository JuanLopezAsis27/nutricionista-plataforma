import { describe, it, expect, vi } from "vitest";
import { CambiarPassword } from "./CambiarPassword";
import { ErrorPasswordIncorrecta } from "@/dominio/errores/ErrorPasswordIncorrecta";
import { ErrorUsuarioNoEncontrado } from "@/dominio/errores/ErrorUsuarioNoEncontrado";
import type { Usuario } from "@/dominio/entidades/Usuario";
import {
  mockUsuarioRepositorio,
  mockHasheador,
  usuarioEjemplo,
} from "../_ayudas-test";

/** El mock de hasheador dice que `hash:X` es el hash de `X`. */
const USUARIO = usuarioEjemplo({ passwordHash: "hash:la-de-siempre" });

/** Lo que el caso de uso mandó a guardar. */
function guardado(
  usuarios: ReturnType<typeof mockUsuarioRepositorio>,
): Usuario {
  const [primero] = (usuarios.actualizar as ReturnType<typeof vi.fn>).mock
    .calls[0] as [Usuario];
  return primero;
}

describe("CambiarPassword", () => {
  it("guarda el hash de la contraseña nueva cuando la actual coincide", async () => {
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () => USUARIO),
    });
    const caso = new CambiarPassword(usuarios, mockHasheador());

    await caso.ejecutar({
      usuarioId: "usr-1",
      passwordActual: "la-de-siempre",
      passwordNueva: "melon-tractor-lunes",
    });

    expect(guardado(usuarios).passwordHash).toBe("hash:melon-tractor-lunes");
  });

  it("rechaza si la contraseña actual no coincide, y NO guarda nada", async () => {
    // Es la regla que sostiene toda la función: sin ella, una sesión ajena
    // dejada abierta alcanza para quedarse con la cuenta.
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () => USUARIO),
    });
    const caso = new CambiarPassword(usuarios, mockHasheador());

    await expect(
      caso.ejecutar({
        usuarioId: "usr-1",
        passwordActual: "la-que-me-parece",
        passwordNueva: "melon-tractor-lunes",
      }),
    ).rejects.toThrow(ErrorPasswordIncorrecta);

    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("nunca guarda la contraseña en claro", async () => {
    // El invariante que el dominio no puede comprobar solo: la entidad recibe
    // un hash y no distingue si le pasaron el texto plano.
    const usuarios = mockUsuarioRepositorio({
      obtenerPorId: vi.fn(async () => USUARIO),
    });
    const caso = new CambiarPassword(usuarios, mockHasheador());

    await caso.ejecutar({
      usuarioId: "usr-1",
      passwordActual: "la-de-siempre",
      passwordNueva: "melon-tractor-lunes",
    });

    expect(guardado(usuarios).passwordHash).not.toBe("melon-tractor-lunes");
  });

  it("falla si el usuario no existe", async () => {
    const caso = new CambiarPassword(mockUsuarioRepositorio(), mockHasheador());

    await expect(
      caso.ejecutar({
        usuarioId: "fantasma",
        passwordActual: "x",
        passwordNueva: "melon-tractor-lunes",
      }),
    ).rejects.toThrow(ErrorUsuarioNoEncontrado);
  });
});
