import { describe, it, expect, vi } from "vitest";
import { SolicitarRecuperacionPassword } from "./SolicitarRecuperacionPassword";
import {
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  mockTokenRecuperacionRepositorio,
  mockGeneradorTokens,
  mockServicioEmail,
  mockReloj,
  usuarioEjemplo,
  mockNutricionistaConNombre,
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
    mockNutricionistaConNombre("Lic. Ejemplo"),
    mockCuentaPacienteRepositorio(),
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

  it("firma con el nombre del consultorio de la cuenta, no con uno fijo", async () => {
    const usuario = usuarioEjemplo({}, "nutri-9");
    const configuracion = mockNutricionistaConNombre("Lic. Ana Gómez");
    const email = mockServicioEmail();
    await new SolicitarRecuperacionPassword(
      mockUsuarioRepositorio({ obtenerPorEmail: vi.fn(async () => usuario) }),
      mockTokenRecuperacionRepositorio(),
      mockGeneradorTokens(),
      email,
      mockReloj(new Date("2026-07-14T12:00:00Z")),
      "https://app.local",
      configuracion,
      mockCuentaPacienteRepositorio(),
    ).ejecutar({ email: "nutri@mail.com" });

    expect(configuracion.nombreDe).toHaveBeenCalledWith("nutri-9");
    const mensaje = (email.enviar as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(mensaje.html).toContain("— Lic. Ana Gómez");
  });

  it("sin consultorio (SUPERADMIN) sale sin firma", async () => {
    const admin = usuarioEjemplo({ rol: "SUPERADMIN", nutricionistaId: null });
    const { uc, email } = armar({
      usuarios: { obtenerPorEmail: vi.fn(async () => admin) },
    });

    await uc.ejecutar({ email: "nutri@mail.com" });

    const mensaje = (email.enviar as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(mensaje.html).not.toContain("—");
  });

  describe("paciente (su cuenta no es de un consultorio)", () => {
    const paciente = usuarioEjemplo({ rol: "PACIENTE" }, "usr-pac");

    async function firmaCon(
      consultorios: { nombreProfesional: string }[],
    ): Promise<string> {
      const email = mockServicioEmail();
      await new SolicitarRecuperacionPassword(
        mockUsuarioRepositorio({
          obtenerPorEmail: vi.fn(async () => paciente),
        }),
        mockTokenRecuperacionRepositorio(),
        mockGeneradorTokens(),
        email,
        mockReloj(new Date("2026-07-14T12:00:00Z")),
        "https://app.local",
        mockNutricionistaConNombre("no se usa"),
        mockCuentaPacienteRepositorio({
          listarDeUsuario: vi.fn(async () =>
            consultorios.map((c, i) => ({
              pacienteId: `pac-${i}`,
              nutricionistaId: `nutri-${i}`,
              fotoProfesionalId: null,
              nombreProfesional: c.nombreProfesional,
            })),
          ),
        }),
      ).ejecutar({ email: "pac@mail.com" });
      return (email.enviar as ReturnType<typeof vi.fn>).mock.calls[0]![0]
        .html as string;
    }

    it("con un solo consultorio, firma con ese", async () => {
      expect(await firmaCon([{ nombreProfesional: "Lic. Sola" }])).toContain(
        "— Lic. Sola",
      );
    });

    it("con varios, no firma: la contraseña es de todos", async () => {
      const html = await firmaCon([
        { nombreProfesional: "Lic. Uno" },
        { nombreProfesional: "Lic. Dos" },
      ]);
      expect(html).not.toContain("Lic. Uno");
      expect(html).not.toContain("Lic. Dos");
    });
  });
});
