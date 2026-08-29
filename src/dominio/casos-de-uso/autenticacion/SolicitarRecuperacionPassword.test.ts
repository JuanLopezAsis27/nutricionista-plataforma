import { describe, it, expect, vi } from "vitest";
import { SolicitarRecuperacionPassword } from "./SolicitarRecuperacionPassword";
import {
  mockUsuarioRepositorio,
  mockTokenRecuperacionRepositorio,
  mockGeneradorTokens,
  mockServicioEmail,
  mockReloj,
  usuarioEjemplo,
} from "../_ayudas-test";

function armar(
  overrides: {
    usuarios?: Parameters<typeof mockUsuarioRepositorio>[0];
    tokens?: Parameters<typeof mockTokenRecuperacionRepositorio>[0];
    email?: Parameters<typeof mockServicioEmail>[0];
  } = {},
) {
  const usuarios = mockUsuarioRepositorio(overrides.usuarios);
  const tokens = mockTokenRecuperacionRepositorio(overrides.tokens);
  const generador = mockGeneradorTokens();
  const email = mockServicioEmail(overrides.email);
  const reloj = mockReloj(new Date("2026-07-14T12:00:00Z"));
  const uc = new SolicitarRecuperacionPassword(
    usuarios,
    tokens,
    generador,
    email,
    reloj,
    "https://app.local",
    "Lic. Ejemplo",
  );
  return { uc, usuarios, tokens, generador, email };
}

describe("SolicitarRecuperacionPassword", () => {
  it("con un email existente: invalida tokens previos, guarda el hash y envía el enlace", async () => {
    const usuario = usuarioEjemplo({ email: "nutri@mail.com" });
    const { uc, tokens, email } = armar({
      usuarios: { obtenerPorEmail: vi.fn(async () => usuario) },
    });

    await uc.ejecutar({ email: "  NUTRI@mail.com " });

    // Invalida los tokens anteriores del usuario.
    expect(tokens.eliminarDeUsuario).toHaveBeenCalledWith(usuario.id);
    // Guarda el token (solo su hash, nunca el token en claro).
    expect(tokens.crear).toHaveBeenCalledTimes(1);
    const guardado = (tokens.crear as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(guardado.tokenHash).toBe("hash:token-claro");
    expect(guardado.expiraEn.getTime()).toBe(
      new Date("2026-07-14T13:00:00Z").getTime(), // +1 hora
    );
    // Envía el email con el enlace que lleva el token EN CLARO.
    expect(email.enviar).toHaveBeenCalledTimes(1);
    const mensaje = (email.enviar as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(mensaje.para).toBe("nutri@mail.com");
    expect(mensaje.html).toContain(
      "https://app.local/restablecer?token=token-claro",
    );
  });

  it("con un email inexistente: no crea token ni envía email (no revela la cuenta)", async () => {
    const { uc, tokens, email } = armar({
      usuarios: { obtenerPorEmail: vi.fn(async () => null) },
    });

    await uc.ejecutar({ email: "desconocido@mail.com" });

    expect(tokens.crear).not.toHaveBeenCalled();
    expect(email.enviar).not.toHaveBeenCalled();
  });

  it("con un usuario inactivo: tampoco envía nada", async () => {
    const inactivo = usuarioEjemplo().cambiarActivo(false);
    const { uc, tokens, email } = armar({
      usuarios: { obtenerPorEmail: vi.fn(async () => inactivo) },
    });

    await uc.ejecutar({ email: "nutri@mail.com" });

    expect(tokens.crear).not.toHaveBeenCalled();
    expect(email.enviar).not.toHaveBeenCalled();
  });
});
