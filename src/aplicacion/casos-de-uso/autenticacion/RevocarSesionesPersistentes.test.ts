import { describe, it, expect, vi } from "vitest";
import { RevocarSesionesPersistentes } from "./RevocarSesionesPersistentes";
import { TokenRefresco } from "@/dominio/entidades/TokenRefresco";
import {
  mockTokenRefrescoRepositorio,
  mockGeneradorTokens,
  mockReloj,
} from "../_ayudas-test";

const AHORA = new Date("2026-07-14T12:00:00Z");

function tokenEjemplo(): TokenRefresco {
  return TokenRefresco.reconstruir({
    id: "ref-1",
    usuarioId: "usr-1",
    familia: "fam-1",
    tokenHash: "hash:token-claro",
    expiraEn: new Date("2026-08-13T12:00:00Z"),
    usadoEn: null,
    revocadoEn: null,
    dispositivo: "Firefox",
    creadoEn: new Date("2026-07-14T11:00:00Z"),
  });
}

function armar(registro: TokenRefresco | null = tokenEjemplo()) {
  const tokens = mockTokenRefrescoRepositorio({
    obtenerPorHash: vi.fn(async () => registro),
  });
  const uc = new RevocarSesionesPersistentes(
    tokens,
    mockGeneradorTokens(),
    mockReloj(AHORA),
  );
  return { uc, tokens };
}

describe("RevocarSesionesPersistentes", () => {
  it("por usuario revoca TODOS sus dispositivos (cambio de contraseña)", async () => {
    const { uc, tokens } = armar();

    await uc.ejecutar({ usuarioId: "usr-1" });

    expect(tokens.revocarDeUsuario).toHaveBeenCalledWith("usr-1", AHORA);
    expect(tokens.revocarFamilia).not.toHaveBeenCalled();
  });

  it("por token revoca solo la familia de ese dispositivo, buscándolo por hash", async () => {
    const { uc, tokens } = armar();

    await uc.ejecutar({ token: "token-claro" });

    expect(tokens.obtenerPorHash).toHaveBeenCalledWith("hash:token-claro");
    expect(tokens.revocarFamilia).toHaveBeenCalledWith("fam-1", AHORA);
    // Cerrar sesión en la compu no puede echar al teléfono.
    expect(tokens.revocarDeUsuario).not.toHaveBeenCalled();
  });

  it("un token que no existe no falla ni revoca nada", async () => {
    const { uc, tokens } = armar(null);

    await expect(
      uc.ejecutar({ token: "desconocido" }),
    ).resolves.toBeUndefined();
    expect(tokens.revocarFamilia).not.toHaveBeenCalled();
  });

  it("sin usuario ni token no hace nada", async () => {
    const { uc, tokens } = armar();

    await uc.ejecutar({});

    expect(tokens.revocarDeUsuario).not.toHaveBeenCalled();
    expect(tokens.revocarFamilia).not.toHaveBeenCalled();
  });
});
