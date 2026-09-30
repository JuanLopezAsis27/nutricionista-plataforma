import { describe, it, expect, vi } from "vitest";
import { EmitirTokenRefresco } from "./EmitirTokenRefresco";
import type { TokenRefresco } from "@/dominio/entidades/TokenRefresco";
import {
  mockTokenRefrescoRepositorio,
  mockGeneradorTokens,
  mockReloj,
} from "../_ayudas-test";

const AHORA = new Date("2026-07-14T12:00:00Z");

function armar() {
  const tokens = mockTokenRefrescoRepositorio();
  const uc = new EmitirTokenRefresco(
    tokens,
    mockGeneradorTokens(),
    mockReloj(AHORA),
    30,
  );
  const guardado = (): TokenRefresco =>
    vi.mocked(tokens.crear).mock.calls[0]![0];
  return { uc, tokens, guardado };
}

describe("EmitirTokenRefresco", () => {
  it("devuelve el token EN CLARO y persiste solo su hash", async () => {
    const { uc, guardado } = armar();

    const emitido = await uc.ejecutar({ usuarioId: "usr-1" });

    expect(emitido.token).toBe("token-claro");
    expect(guardado().tokenHash).toBe("hash:token-claro");
    expect(guardado().usuarioId).toBe("usr-1");
  });

  it("vence a los días configurados", async () => {
    const { uc, guardado } = armar();

    const emitido = await uc.ejecutar({ usuarioId: "usr-1" });

    const esperado = new Date("2026-08-13T12:00:00Z");
    expect(emitido.expiraEn).toEqual(esperado);
    expect(guardado().expiraEn).toEqual(esperado);
  });

  it("un login abre una familia nueva en cada emisión", async () => {
    const { uc } = armar();

    const a = await uc.ejecutar({ usuarioId: "usr-1" });
    const b = await uc.ejecutar({ usuarioId: "usr-1" });

    expect(a.familia).toBeTruthy();
    expect(a.familia).not.toBe(b.familia);
  });

  it("la renovación continúa la familia que recibe", async () => {
    // Es lo que después permite revocar toda la cadena ante una reutilización.
    const { uc, guardado } = armar();

    const emitido = await uc.ejecutar({ usuarioId: "usr-1", familia: "fam-1" });

    expect(emitido.familia).toBe("fam-1");
    expect(guardado().familia).toBe("fam-1");
  });

  it("recorta el User-Agent a 200 caracteres y descarta el vacío", async () => {
    const largo = armar();
    await largo.uc.ejecutar({
      usuarioId: "usr-1",
      dispositivo: "x".repeat(500),
    });
    expect(largo.guardado().dispositivo).toHaveLength(200);

    const vacio = armar();
    await vacio.uc.ejecutar({ usuarioId: "usr-1", dispositivo: "   " });
    expect(vacio.guardado().dispositivo).toBeNull();
  });
});
