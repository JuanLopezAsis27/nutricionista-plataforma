import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * El puente entre Auth.js y las sesiones persistentes: lo que se testea es que
 * la COOKIE quede como corresponde en cada uno de los tres momentos (abrir,
 * renovar, cerrar), que es lo que el caso de uso no ve.
 */

const almacen = new Map<string, { valor: string; opciones: unknown }>();
const cookiesMock = {
  get: vi.fn((nombre: string) => {
    const c = almacen.get(nombre);
    return c ? { value: c.valor } : undefined;
  }),
  set: vi.fn((nombre: string, valor: string, opciones: unknown) => {
    almacen.set(nombre, { valor, opciones });
  }),
};
vi.mock("next/headers", () => ({ cookies: async () => cookiesMock }));

const servicio = {
  abrirSesionPersistente: vi.fn(),
  renovarSesion: vi.fn(),
  cerrarSesionPersistente: vi.fn(),
};
vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  servicioAutenticacion: () => servicio,
}));

const { abrirSesionPersistente, renovarDesdeCookie, cerrarSesionPersistente } =
  await import("./sesionPersistente");
const { NOMBRE_COOKIE_REFRESCO } = await import("./cookieRefresco");

const VENCE = new Date("2026-08-13T12:00:00Z");
const peticion = new Request("https://app.nutri.com/login", {
  headers: { "user-agent": "Firefox" },
});
const cookie = () => almacen.get(NOMBRE_COOKIE_REFRESCO);

beforeEach(() => {
  almacen.clear();
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("abrirSesionPersistente", () => {
  it("escribe la cookie con el token emitido, httpOnly y con su vencimiento", async () => {
    servicio.abrirSesionPersistente.mockResolvedValue({
      token: "t1",
      expiraEn: VENCE,
    });

    await abrirSesionPersistente("usr-1", peticion);

    expect(servicio.abrirSesionPersistente).toHaveBeenCalledWith({
      usuarioId: "usr-1",
      dispositivo: "Firefox",
    });
    expect(cookie()).toEqual({
      valor: "t1",
      opciones: expect.objectContaining({ httpOnly: true, expires: VENCE }),
    });
  });

  it("si falla NO hace fallar el login: solo no deja cookie", async () => {
    servicio.abrirSesionPersistente.mockRejectedValue(new Error("base caída"));

    await expect(
      abrirSesionPersistente("usr-1", peticion),
    ).resolves.toBeUndefined();
    expect(cookie()).toBeUndefined();
  });
});

describe("renovarDesdeCookie", () => {
  it("sin cookie no intenta renovar", async () => {
    expect(await renovarDesdeCookie(peticion)).toBeNull();
    expect(servicio.renovarSesion).not.toHaveBeenCalled();
  });

  it("canjea la cookie, la ROTA y devuelve la identidad", async () => {
    almacen.set(NOMBRE_COOKIE_REFRESCO, { valor: "viejo", opciones: {} });
    const usuario = { id: "usr-1", rol: "NUTRICIONISTA" };
    servicio.renovarSesion.mockResolvedValue({
      token: "nuevo",
      expiraEn: VENCE,
      usuario,
    });

    expect(await renovarDesdeCookie(peticion)).toBe(usuario);
    expect(servicio.renovarSesion).toHaveBeenCalledWith(
      expect.objectContaining({ token: "viejo", dispositivo: "Firefox" }),
    );
    // Sin la rotación, mañana el token viejo ya estaría consumido.
    expect(cookie()?.valor).toBe("nuevo");
  });

  it("con un token que no sirve devuelve null y BORRA la cookie", async () => {
    almacen.set(NOMBRE_COOKIE_REFRESCO, { valor: "robado", opciones: {} });
    servicio.renovarSesion.mockRejectedValue(new Error("reutilizado"));

    expect(await renovarDesdeCookie(peticion)).toBeNull();
    expect(cookie()).toEqual({
      valor: "",
      opciones: expect.objectContaining({ maxAge: 0 }),
    });
  });
});

describe("cerrarSesionPersistente", () => {
  it("revoca la cadena del token y borra la cookie", async () => {
    almacen.set(NOMBRE_COOKIE_REFRESCO, { valor: "t1", opciones: {} });

    await cerrarSesionPersistente();

    expect(servicio.cerrarSesionPersistente).toHaveBeenCalledWith("t1");
    expect(cookie()?.valor).toBe("");
  });

  it("si la revocación falla, igual borra la cookie", async () => {
    almacen.set(NOMBRE_COOKIE_REFRESCO, { valor: "t1", opciones: {} });
    servicio.cerrarSesionPersistente.mockRejectedValue(new Error("caída"));

    await expect(cerrarSesionPersistente()).resolves.toBeUndefined();
    expect(cookie()?.valor).toBe("");
  });
});
