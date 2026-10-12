import { beforeEach, describe, expect, it, vi } from "vitest";

// `next-auth` no carga bajo Vitest (importa `next/server` sin extensión): se
// dobla la clase de error, que es lo único que el handler usa de ahí.
class CredentialsSignin extends Error {}
vi.mock("next-auth", () => ({ CredentialsSignin }));

const signIn = vi.fn();
const borrarCookieRefresco = vi.fn();

vi.mock("@/lib/autenticacion/auth", () => ({ signIn }));
vi.mock("@/lib/autenticacion/sesionPersistente", () => ({
  borrarCookieRefresco,
}));
vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  urlApp: (): string => "https://app.ejemplo.com",
}));

const { GET } = await import("./route");

function pedido(): Request {
  return new Request(
    "http://0.0.0.0:3000/api/autenticacion/renovar?destino=%2Fdashboard",
  );
}

describe("GET /api/autenticacion/renovar", () => {
  beforeEach(() => {
    signIn.mockReset();
    borrarCookieRefresco.mockReset();
  });

  it("con el token canjeado, vuelve a donde iba", async () => {
    signIn.mockResolvedValue("https://app.ejemplo.com/dashboard");

    const respuesta = await GET(pedido());

    expect(respuesta.headers.get("location")).toBe(
      "https://app.ejemplo.com/dashboard",
    );
    expect(borrarCookieRefresco).not.toHaveBeenCalled();
  });

  // Auth.js en modo `raw` LANZA el CredentialsSignin: así daba 500 en bucle.
  it("si el token no sirve, manda al login y borra la cookie en vez de dar 500", async () => {
    signIn.mockRejectedValue(new CredentialsSignin());

    const respuesta = await GET(pedido());

    expect(respuesta.status).toBe(307);
    expect(respuesta.headers.get("location")).toMatch(
      /^https:\/\/app\.ejemplo\.com\/login\?/,
    );
    expect(borrarCookieRefresco).toHaveBeenCalled();
  });

  it("si la URL vuelve con error, también manda al login", async () => {
    signIn.mockResolvedValue("https://app.ejemplo.com/login?error=Algo");

    const respuesta = await GET(pedido());

    expect(respuesta.headers.get("location")).toMatch(/\/login\?/);
    expect(borrarCookieRefresco).toHaveBeenCalled();
  });

  it("un error que no es de credenciales sigue lanzando, para el monitor", async () => {
    signIn.mockRejectedValue(new Error("configuración rota"));

    await expect(GET(pedido())).rejects.toThrow("configuración rota");
  });
});
