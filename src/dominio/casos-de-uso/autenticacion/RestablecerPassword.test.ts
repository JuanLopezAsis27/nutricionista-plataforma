import { describe, it, expect, vi } from "vitest";
import { RestablecerPassword } from "./RestablecerPassword";
import { ErrorTokenInvalido } from "../../errores/ErrorTokenInvalido";
import { TokenRecuperacion } from "../../entidades/TokenRecuperacion";
import {
  mockUsuarioRepositorio,
  mockTokenRecuperacionRepositorio,
  mockGeneradorTokens,
  mockHasheador,
  mockReloj,
  usuarioEjemplo,
} from "../_ayudas-test";

const AHORA = new Date("2026-07-14T12:00:00Z");

function tokenEjemplo(
  cambios: Partial<{ expiraEn: Date; usado: boolean }> = {},
) {
  // Se usa `reconstruir` (no `crear`) para poder fabricar tokens vencidos o
  // usados, que `crear` rechazaría por su validación de expiración futura.
  return TokenRecuperacion.reconstruir({
    id: "tok-1",
    usuarioId: "usr-1",
    tokenHash: "hash:token-claro",
    expiraEn: cambios.expiraEn ?? new Date("2026-07-14T13:00:00Z"),
    usadoEn: cambios.usado ? AHORA : null,
    creadoEn: AHORA,
  });
}

function armar(
  overrides: {
    usuario?: ReturnType<typeof usuarioEjemplo> | null;
    token?: TokenRecuperacion | null;
  } = {},
) {
  const usuarios = mockUsuarioRepositorio({
    obtenerPorId: vi.fn(async () =>
      overrides.usuario === undefined ? usuarioEjemplo() : overrides.usuario,
    ),
  });
  const tokens = mockTokenRecuperacionRepositorio({
    obtenerPorHash: vi.fn(async () =>
      overrides.token === undefined ? tokenEjemplo() : overrides.token,
    ),
  });
  const generador = mockGeneradorTokens();
  const hasheador = mockHasheador();
  const reloj = mockReloj(AHORA);
  const uc = new RestablecerPassword(
    usuarios,
    tokens,
    generador,
    hasheador,
    reloj,
  );
  return { uc, usuarios, tokens, generador, hasheador };
}

describe("RestablecerPassword", () => {
  it("con token válido: hashea la nueva contraseña, la guarda y consume el token", async () => {
    const { uc, usuarios, tokens, generador } = armar();

    await uc.ejecutar({ token: "token-claro", nuevaPassword: "nuevaClave" });

    // Busca el token por su hash (nunca por el valor en claro).
    expect(generador.hashear).toHaveBeenCalledWith("token-claro");
    expect(tokens.obtenerPorHash).toHaveBeenCalledWith("hash:token-claro");
    // Guarda el usuario con la contraseña nueva hasheada.
    const guardado = (usuarios.actualizar as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(guardado.passwordHash).toBe("hash:nuevaClave");
    // Consume el token (un solo uso).
    expect(tokens.marcarUsado).toHaveBeenCalledWith("tok-1", AHORA);
  });

  it("token inexistente → ErrorTokenInvalido, sin tocar el usuario", async () => {
    const { uc, usuarios } = armar({ token: null });
    await expect(
      uc.ejecutar({ token: "x", nuevaPassword: "nuevaClave" }),
    ).rejects.toBeInstanceOf(ErrorTokenInvalido);
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });

  it("token vencido → ErrorTokenInvalido", async () => {
    const vencido = tokenEjemplo({
      expiraEn: new Date("2026-07-14T11:00:00Z"),
    });
    const { uc } = armar({ token: vencido });
    await expect(
      uc.ejecutar({ token: "x", nuevaPassword: "nuevaClave" }),
    ).rejects.toBeInstanceOf(ErrorTokenInvalido);
  });

  it("token ya usado → ErrorTokenInvalido", async () => {
    const usado = tokenEjemplo({ usado: true });
    const { uc, tokens } = armar({ token: usado });
    await expect(
      uc.ejecutar({ token: "x", nuevaPassword: "nuevaClave" }),
    ).rejects.toBeInstanceOf(ErrorTokenInvalido);
    expect(tokens.marcarUsado).not.toHaveBeenCalled();
  });
});
