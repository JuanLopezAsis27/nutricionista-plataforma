import { describe, it, expect, vi } from "vitest";
import { IniciarSesion } from "./IniciarSesion";
import type { ILimitadorIntentos } from "@/dominio/servicios/ILimitadorIntentos";
import type { Usuario } from "@/dominio/entidades/Usuario";
import {
  mockUsuarioRepositorio,
  mockHasheador,
  usuarioEjemplo,
} from "../_ayudas-test";

/**
 * Las reglas del login con contraseña. Las que no se pueden romper:
 * «no existe» y «contraseña incorrecta» son indistinguibles, el bloqueo se
 * decide sin mirar ninguna cuenta y la baja se dice recién con la contraseña
 * verificada.
 */

const HASH_BUENO = "hash:correcta";

function limitador(bloqueadas: string[] = []): ILimitadorIntentos {
  return {
    estaBloqueada: vi.fn((clave: string) => ({
      bloqueada: bloqueadas.includes(clave),
    })),
    registrarFallo: vi.fn(),
    registrarExito: vi.fn(),
  };
}

function cuenta(cambios: { activo?: boolean } = {}): Usuario {
  return usuarioEjemplo({
    email: "ana@mail.com",
    passwordHash: HASH_BUENO,
    ...cambios,
  });
}

function armar(
  overrides: {
    usuario?: Usuario | null;
    bloqueadas?: string[];
    necesitaRehash?: boolean;
  } = {},
) {
  const usuario =
    overrides.usuario === undefined ? cuenta() : overrides.usuario;
  const usuarios = mockUsuarioRepositorio({
    obtenerPorEmail: vi.fn(async () => usuario),
    obtenerPorNombreUsuario: vi.fn(async () => usuario),
  });
  const hasheador = {
    ...mockHasheador(),
    necesitaRehash: vi.fn(() => overrides.necesitaRehash ?? false),
  };
  const intentos = limitador(overrides.bloqueadas);
  const uc = new IniciarSesion(usuarios, hasheador, intentos);
  return { uc, usuarios, hasheador, intentos };
}

const ENTRADA = {
  identificador: "ana@mail.com",
  password: "correcta",
  ip: "1.2.3.4",
};

describe("IniciarSesion", () => {
  it("con las credenciales correctas devuelve el usuario y limpia los contadores", async () => {
    const { uc, intentos } = armar();

    const resultado = await uc.ejecutar(ENTRADA);

    expect(resultado).toEqual({ tipo: "CORRECTO", usuario: expect.anything() });
    expect(intentos.registrarExito).toHaveBeenCalledWith("ip:1.2.3.4");
    expect(intentos.registrarExito).toHaveBeenCalledWith("cuenta:ana@mail.com");
    expect(intentos.registrarFallo).not.toHaveBeenCalled();
  });

  describe("no enumera cuentas", () => {
    it("una cuenta que no existe y una contraseña incorrecta dan EXACTAMENTE lo mismo", async () => {
      const noExiste = await armar({ usuario: null }).uc.ejecutar(ENTRADA);
      const incorrecta = await armar().uc.ejecutar({
        ...ENTRADA,
        password: "otra",
      });

      expect(noExiste).toEqual({ tipo: "RECHAZADO" });
      expect(incorrecta).toEqual(noExiste);
    });

    it("los dos suman un fallo a la IP y a la cuenta intentada, exista o no", async () => {
      const inexistente = armar({ usuario: null });
      await inexistente.uc.ejecutar(ENTRADA);
      const incorrecta = armar();
      await incorrecta.uc.ejecutar({ ...ENTRADA, password: "otra" });

      for (const { intentos } of [inexistente, incorrecta]) {
        expect(intentos.registrarFallo).toHaveBeenCalledWith("ip:1.2.3.4");
        expect(intentos.registrarFallo).toHaveBeenCalledWith(
          "cuenta:ana@mail.com",
        );
      }
    });
  });

  describe("cuenta desactivada", () => {
    it("con la contraseña correcta se informa como INACTIVA", async () => {
      const { uc, intentos } = armar({ usuario: cuenta({ activo: false }) });

      expect(await uc.ejecutar(ENTRADA)).toEqual({ tipo: "INACTIVA" });
      expect(intentos.registrarFallo).toHaveBeenCalledTimes(2);
    });

    it("con la contraseña INCORRECTA no se delata: sale como cualquier rechazo", async () => {
      const { uc } = armar({ usuario: cuenta({ activo: false }) });

      expect(await uc.ejecutar({ ...ENTRADA, password: "otra" })).toEqual({
        tipo: "RECHAZADO",
      });
    });
  });

  describe("bloqueo por intentos", () => {
    it.each(["ip:1.2.3.4", "cuenta:ana@mail.com"])(
      "con %s bloqueada responde BLOQUEADO sin buscar la cuenta ni verificar",
      async (bloqueada) => {
        const { uc, usuarios, hasheador } = armar({ bloqueadas: [bloqueada] });

        expect(await uc.ejecutar(ENTRADA)).toEqual({ tipo: "BLOQUEADO" });
        // Ni la base ni bcrypt: el bloqueo no mira ninguna cuenta y además
        // evita que el costo de bcrypt sea un vector de DoS.
        expect(usuarios.obtenerPorEmail).not.toHaveBeenCalled();
        expect(hasheador.verificar).not.toHaveBeenCalled();
      },
    );

    it("bloqueada, ni la contraseña correcta entra", async () => {
      const { uc } = armar({ bloqueadas: ["cuenta:ana@mail.com"] });

      expect((await uc.ejecutar(ENTRADA)).tipo).toBe("BLOQUEADO");
    });
  });

  describe("identificador", () => {
    it("con arroba busca por email; sin, por nombre de usuario", async () => {
      const porEmail = armar();
      await porEmail.uc.ejecutar(ENTRADA);
      expect(porEmail.usuarios.obtenerPorEmail).toHaveBeenCalledWith(
        "ana@mail.com",
      );

      const porUsuario = armar();
      await porUsuario.uc.ejecutar({ ...ENTRADA, identificador: "anagarcia" });
      expect(porUsuario.usuarios.obtenerPorNombreUsuario).toHaveBeenCalledWith(
        "anagarcia",
      );
      expect(porUsuario.usuarios.obtenerPorEmail).not.toHaveBeenCalled();
    });

    it("normaliza mayúsculas y espacios, también en la clave del bloqueo", async () => {
      // Sin esto, «Ana@Mail.com» y «ana@mail.com» serían dos contadores y el
      // límite por cuenta se esquivaría cambiando mayúsculas.
      const { uc, usuarios, intentos } = armar({ usuario: null });

      await uc.ejecutar({ ...ENTRADA, identificador: "  Ana@Mail.COM " });

      expect(usuarios.obtenerPorEmail).toHaveBeenCalledWith("ana@mail.com");
      expect(intentos.registrarFallo).toHaveBeenCalledWith(
        "cuenta:ana@mail.com",
      );
    });
  });

  describe("re-hasheo", () => {
    it("regraba un hash de costo viejo con la contraseña recién verificada", async () => {
      const { uc, usuarios } = armar({ necesitaRehash: true });

      await uc.ejecutar(ENTRADA);

      const guardado = vi.mocked(usuarios.actualizar).mock.calls[0]![0];
      expect(guardado.passwordHash).toBe("hash:correcta");
    });

    it("no regraba si el hash está al día", async () => {
      const { uc, usuarios } = armar();

      await uc.ejecutar(ENTRADA);

      expect(usuarios.actualizar).not.toHaveBeenCalled();
    });

    it("si el re-hasheo falla, el login igual es correcto", async () => {
      const { uc, usuarios } = armar({ necesitaRehash: true });
      vi.mocked(usuarios.actualizar).mockRejectedValueOnce(new Error("caída"));

      expect((await uc.ejecutar(ENTRADA)).tipo).toBe("CORRECTO");
    });
  });
});
