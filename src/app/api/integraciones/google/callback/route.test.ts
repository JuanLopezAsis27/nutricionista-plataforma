import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * La vuelta del OAuth de Google. Lo que protege es el `state`: sin compararlo
 * contra la cookie que dejó `/conectar`, cualquiera podría hacerle abrir a un
 * profesional un enlace con un `code` propio y dejar el calendario del
 * consultorio conectado a la cuenta de Google del atacante (CSRF de login).
 */

type Sesion = { id: string; rol: string } | null;
let sesion: Sesion = null;
vi.mock("@/lib/autenticacion/sesion", () => ({
  usuarioDeSesion: async () => sesion,
}));
vi.mock("@/servidor/alcanceRequest", () => ({
  conAlcanceDeSesion: <T>(fn: () => Promise<T>) => fn(),
}));

let cookieEstado: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) =>
      nombre === "g_oauth_state" && cookieEstado
        ? { value: cookieEstado }
        : undefined,
  }),
}));

const google = { intercambiarCodigo: vi.fn(async () => ({ access: "t" })) };
let hayGoogle = true;
const guardarConexionGoogle = vi.fn(async () => {});
vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  proveedorGoogle: () => (hayGoogle ? google : null),
  servicioIntegraciones: () => ({ guardarConexionGoogle }),
  urlApp: () => "https://app.nutri.com",
}));

const { GET } = await import("./route");

function vuelta(query: string): Request {
  return new Request(
    `https://0.0.0.0:3000/api/integraciones/google/callback?${query}`,
  );
}

function destino(respuesta: Response): URL {
  return new URL(respuesta.headers.get("location")!);
}

beforeEach(() => {
  vi.clearAllMocks();
  sesion = { id: "usr-n", rol: "NUTRICIONISTA" };
  cookieEstado = "estado-123";
  hayGoogle = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/integraciones/google/callback", () => {
  it("con el state correcto guarda la conexión, borra la cookie y vuelve", async () => {
    const respuesta = await GET(vuelta("code=abc&state=estado-123"));

    expect(google.intercambiarCodigo).toHaveBeenCalledWith("abc");
    expect(guardarConexionGoogle).toHaveBeenCalledOnce();
    expect(destino(respuesta).searchParams.get("conectado")).toBe("1");
    expect(respuesta.headers.get("set-cookie")).toMatch(/g_oauth_state=;/);
  });

  it("vuelve SIEMPRE a la URL pública de la app, no al Host que llegó", async () => {
    const respuesta = await GET(vuelta("code=abc&state=estado-123"));

    expect(destino(respuesta).origin).toBe("https://app.nutri.com");
  });

  it.each([
    ["un state distinto", "code=abc&state=otro"],
    ["sin state", "code=abc"],
    ["sin code", "state=estado-123"],
  ])("con %s no canjea nada", async (_caso, query) => {
    const respuesta = await GET(vuelta(query));

    expect(destino(respuesta).searchParams.get("error")).toBe("estado");
    expect(google.intercambiarCodigo).not.toHaveBeenCalled();
    expect(guardarConexionGoogle).not.toHaveBeenCalled();
  });

  it("sin la cookie del state (no pasó por /conectar) no canjea nada", async () => {
    cookieEstado = undefined;

    await GET(vuelta("code=abc&state=estado-123"));

    expect(google.intercambiarCodigo).not.toHaveBeenCalled();
  });

  it.each([null, "PACIENTE", "SUPERADMIN"])(
    "con sesión %s no canjea nada",
    async (rol) => {
      sesion = rol ? { id: "usr-x", rol } : null;

      const respuesta = await GET(vuelta("code=abc&state=estado-123"));

      expect(destino(respuesta).searchParams.get("error")).toBe(
        "no-disponible",
      );
      expect(google.intercambiarCodigo).not.toHaveBeenCalled();
    },
  );

  it("si el usuario rechazó el permiso en Google, lo dice", async () => {
    const respuesta = await GET(vuelta("error=access_denied&state=estado-123"));

    expect(destino(respuesta).searchParams.get("error")).toBe("denegado");
    expect(google.intercambiarCodigo).not.toHaveBeenCalled();
  });

  it("si el canje falla, vuelve con error sin guardar", async () => {
    google.intercambiarCodigo.mockRejectedValueOnce(new Error("invalid_grant"));

    const respuesta = await GET(vuelta("code=abc&state=estado-123"));

    expect(destino(respuesta).searchParams.get("error")).toBe("fallo");
    expect(guardarConexionGoogle).not.toHaveBeenCalled();
  });
});
