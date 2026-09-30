import { describe, it, expect, vi } from "vitest";
import { RestablecerPasswordPaciente } from "./RestablecerPasswordPaciente";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import type { Usuario } from "@/dominio/entidades/Usuario";
import {
  mockUsuarioRepositorio,
  mockCuentaPacienteRepositorio,
  mockTokenRefrescoRepositorio,
  mockHasheador,
  mockReloj,
  usuarioEjemplo,
} from "../_ayudas-test";

const AHORA = new Date("2026-07-14T12:00:00Z");

function cuentaPaciente(): Usuario {
  return usuarioEjemplo(
    { rol: "PACIENTE", email: null, nombreUsuario: "juanperez" },
    "usr-pac",
  );
}

function armar(
  overrides: { cuenta?: Usuario | null; fichasDeLaCuenta?: number } = {},
) {
  const usuarios = mockUsuarioRepositorio({
    obtenerPorPacienteId: vi.fn(async () =>
      overrides.cuenta === undefined ? cuentaPaciente() : overrides.cuenta,
    ),
  });
  const cuentas = mockCuentaPacienteRepositorio({
    contarDeUsuario: vi.fn(async () => overrides.fichasDeLaCuenta ?? 1),
  });
  const tokens = mockTokenRefrescoRepositorio();
  const generador = { generar: vi.fn(() => "Generada-123") };
  const uc = new RestablecerPasswordPaciente(
    usuarios,
    cuentas,
    mockHasheador(),
    generador,
    tokens,
    mockReloj(AHORA),
  );
  return { uc, usuarios, tokens, generador };
}

describe("RestablecerPasswordPaciente", () => {
  it("sin contraseña indicada genera una y la devuelve con el identificador", async () => {
    const { uc, generador } = armar();

    const credenciales = await uc.ejecutar({ pacienteId: "pac-1" });

    expect(generador.generar).toHaveBeenCalledOnce();
    expect(credenciales).toEqual({
      identificador: "juanperez",
      contrasena: "Generada-123",
    });
  });

  it("usa la que escribió el profesional y no genera ninguna", async () => {
    const { uc, generador } = armar();

    const credenciales = await uc.ejecutar({
      pacienteId: "pac-1",
      contrasena: "Elegida-456",
    });

    expect(generador.generar).not.toHaveBeenCalled();
    expect(credenciales.contrasena).toBe("Elegida-456");
  });

  it("guarda el HASH, la deja provisional y cierra las sesiones persistentes", async () => {
    const { uc, usuarios, tokens } = armar();

    await uc.ejecutar({ pacienteId: "pac-1", contrasena: "Elegida-456" });

    const guardada = vi.mocked(usuarios.actualizar).mock.calls[0]![0];
    expect(guardada.passwordHash).toBe("hash:Elegida-456");
    expect(guardada.passwordProvisional).toBe(true);
    // Sin esto, quien tuviera la sesión abierta seguiría adentro con la vieja.
    expect(tokens.revocarDeUsuario).toHaveBeenCalledWith("usr-pac", AHORA);
  });

  it("rechaza una cuenta COMPARTIDA con otro consultorio, sin tocar nada", async () => {
    // La contraseña de una cuenta compartida abre también la ficha del otro
    // consultorio: fijarla sería poder entrar como el paciente allá.
    const { uc, usuarios, tokens } = armar({ fichasDeLaCuenta: 2 });

    await expect(uc.ejecutar({ pacienteId: "pac-1" })).rejects.toThrow(
      ErrorValidacion,
    );
    expect(usuarios.actualizar).not.toHaveBeenCalled();
    expect(tokens.revocarDeUsuario).not.toHaveBeenCalled();
  });

  it("rechaza un paciente sin cuenta del portal", async () => {
    const { uc, usuarios } = armar({ cuenta: null });

    await expect(uc.ejecutar({ pacienteId: "pac-1" })).rejects.toThrow(
      /no tiene cuenta del portal/,
    );
    expect(usuarios.actualizar).not.toHaveBeenCalled();
  });
});
