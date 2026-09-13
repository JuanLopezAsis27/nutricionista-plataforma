import { describe, it, expect, vi } from "vitest";
import { RenovarSesion } from "./RenovarSesion";
import { ErrorTokenInvalido } from "@/dominio/errores/ErrorTokenInvalido";
import { TokenRefresco } from "@/dominio/entidades/TokenRefresco";
import {
  mockUsuarioRepositorio,
  mockTokenRefrescoRepositorio,
  mockGeneradorTokens,
  mockReloj,
  usuarioEjemplo,
} from "../_ayudas-test";

const AHORA = new Date("2026-07-14T12:00:00Z");

/**
 * Se usa `reconstruir` y no `crear` para poder fabricar tokens vencidos,
 * usados o revocados, que `crear` rechazaría.
 */
function tokenEjemplo(
  cambios: Partial<{
    expiraEn: Date;
    usadoEn: Date | null;
    revocadoEn: Date | null;
  }> = {},
) {
  return TokenRefresco.reconstruir({
    id: "ref-1",
    usuarioId: "usr-1",
    familia: "fam-1",
    tokenHash: "hash:token-claro",
    expiraEn: cambios.expiraEn ?? new Date("2026-08-13T12:00:00Z"),
    usadoEn: cambios.usadoEn ?? null,
    revocadoEn: cambios.revocadoEn ?? null,
    dispositivo: "Firefox",
    creadoEn: new Date("2026-07-14T11:00:00Z"),
  });
}

function armar(
  overrides: {
    usuario?: ReturnType<typeof usuarioEjemplo> | null;
    token?: TokenRefresco | null;
  } = {},
) {
  const usuarios = mockUsuarioRepositorio({
    obtenerPorId: vi.fn(async () =>
      overrides.usuario === undefined ? usuarioEjemplo() : overrides.usuario,
    ),
  });
  const tokens = mockTokenRefrescoRepositorio({
    obtenerPorHash: vi.fn(async () =>
      overrides.token === undefined ? tokenEjemplo() : overrides.token,
    ),
  });
  const uc = new RenovarSesion(
    usuarios,
    tokens,
    mockGeneradorTokens(),
    mockReloj(AHORA),
  );
  return { uc, usuarios, tokens };
}

describe("RenovarSesion", () => {
  it("con un token válido devuelve al usuario y consume el token", async () => {
    const { uc, tokens } = armar();

    const resultado = await uc.ejecutar({ token: "token-claro" });

    expect(resultado.usuario.id).toBe("usr-1");
    // La familia se conserva: el token siguiente nace en la misma cadena, que
    // es lo que después permite detectar la reutilización de cualquier eslabón.
    expect(resultado.familia).toBe("fam-1");
    expect(tokens.marcarUsado).toHaveBeenCalledWith("ref-1", AHORA);
  });

  it("token inexistente → ErrorTokenInvalido y no revoca ninguna familia", async () => {
    // No hay familia que revocar y tampoco hay que inventar una: un token que
    // no existe no dice nada de nadie.
    const { uc, tokens } = armar({ token: null });

    await expect(uc.ejecutar({ token: "x" })).rejects.toBeInstanceOf(
      ErrorTokenInvalido,
    );
    expect(tokens.revocarFamilia).not.toHaveBeenCalled();
  });

  it("token vencido → ErrorTokenInvalido, sin consumirlo", async () => {
    const { uc, tokens } = armar({
      token: tokenEjemplo({ expiraEn: new Date("2026-07-14T11:59:00Z") }),
    });

    await expect(uc.ejecutar({ token: "x" })).rejects.toBeInstanceOf(
      ErrorTokenInvalido,
    );
    expect(tokens.marcarUsado).not.toHaveBeenCalled();
    expect(tokens.revocarFamilia).not.toHaveBeenCalled();
  });

  it("token revocado → ErrorTokenInvalido", async () => {
    const { uc } = armar({
      token: tokenEjemplo({ revocadoEn: new Date("2026-07-14T10:00:00Z") }),
    });

    await expect(uc.ejecutar({ token: "x" })).rejects.toBeInstanceOf(
      ErrorTokenInvalido,
    );
  });

  it("reutilización: un token ya canjeado hace caer la familia ENTERA", async () => {
    // Es la defensa central de la rotación. No se puede saber si lo presentó
    // el ladrón o el dueño, así que caen los dos y el dueño vuelve a entrar
    // con su contraseña.
    const { uc, tokens } = armar({
      token: tokenEjemplo({ usadoEn: new Date("2026-07-14T10:00:00Z") }),
    });

    await expect(uc.ejecutar({ token: "x" })).rejects.toBeInstanceOf(
      ErrorTokenInvalido,
    );
    expect(tokens.revocarFamilia).toHaveBeenCalledWith("fam-1", AHORA);
  });

  it("dentro de la ventana de gracia la renovación se concede y NO revoca", async () => {
    // Dos pestañas presentan la misma cookie casi a la vez: la segunda llega
    // con un token que ya figura usado. Tratarlo como robo echaría a alguien
    // de todos sus dispositivos por haber abierto dos pestañas.
    const haceDiezSegundos = new Date(AHORA.getTime() - 10_000);
    const { uc, tokens } = armar({
      token: tokenEjemplo({ usadoEn: haceDiezSegundos }),
    });

    const resultado = await uc.ejecutar({ token: "x" });

    expect(resultado.usuario.id).toBe("usr-1");
    expect(tokens.revocarFamilia).not.toHaveBeenCalled();
    // Ya estaba consumido: volver a marcarlo correría la ventana hacia
    // adelante en cada reintento y la volvería indefinida.
    expect(tokens.marcarUsado).not.toHaveBeenCalled();
  });

  it("pasada la gracia, el mismo token ya es reutilización", async () => {
    const haceUnMinuto = new Date(AHORA.getTime() - 60_000);
    const { uc, tokens } = armar({
      token: tokenEjemplo({ usadoEn: haceUnMinuto }),
    });

    await expect(uc.ejecutar({ token: "x" })).rejects.toBeInstanceOf(
      ErrorTokenInvalido,
    );
    expect(tokens.revocarFamilia).toHaveBeenCalledWith("fam-1", AHORA);
  });

  it("cuenta dada de baja: no renueva y corta la cadena", async () => {
    // Es el motivo por el que se revalida contra la base en cada renovación:
    // desactivar una cuenta no puede dejarle una credencial que la resucite.
    const { uc, tokens } = armar({
      usuario: usuarioEjemplo({ activo: false }),
    });

    await expect(uc.ejecutar({ token: "x" })).rejects.toBeInstanceOf(
      ErrorTokenInvalido,
    );
    expect(tokens.revocarFamilia).toHaveBeenCalledWith("fam-1", AHORA);
    expect(tokens.marcarUsado).not.toHaveBeenCalled();
  });

  it("usuario inexistente: no renueva y corta la cadena", async () => {
    const { uc, tokens } = armar({ usuario: null });

    await expect(uc.ejecutar({ token: "x" })).rejects.toBeInstanceOf(
      ErrorTokenInvalido,
    );
    expect(tokens.revocarFamilia).toHaveBeenCalledWith("fam-1", AHORA);
  });

  it("busca por el HASH del token, nunca por el valor en claro", async () => {
    // El valor en claro no está en la base: si esto se rompiera, no habría
    // forma de encontrar ningún token y nadie renovaría nunca.
    const { uc, tokens } = armar();

    await uc.ejecutar({ token: "token-claro" });

    expect(tokens.obtenerPorHash).toHaveBeenCalledWith("hash:token-claro");
  });
});
