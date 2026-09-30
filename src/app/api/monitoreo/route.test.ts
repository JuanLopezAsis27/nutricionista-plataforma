import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * La ingesta de errores del navegador: pública y sin sesión a propósito, así
 * que lo que la protege es el límite por IP y el recorte de lo que llega.
 */

const intentar = vi.fn((_ip: string) => ({ permitido: true }));
vi.mock("@/infraestructura/seguridad/LimitadorTasa", () => ({
  limitadorMonitoreo: { intentar: (ip: string) => intentar(ip) },
}));

const capturar = vi.fn();
vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: (...args: unknown[]) => capturar(...args) },
}));

const { POST } = await import("./route");

function aviso(
  cuerpo: string,
  cabeceras: Record<string, string> = {},
): Request {
  return new Request("https://app.nutri.com/api/monitoreo", {
    method: "POST",
    body: cuerpo,
    headers: cabeceras,
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/monitoreo", () => {
  it("registra el error del cliente y responde sin contenido", async () => {
    const respuesta = await POST(
      aviso(JSON.stringify({ mensaje: "Falló el render", ruta: "/dashboard" })),
    );

    expect(respuesta.status).toBe(204);
    expect(capturar).toHaveBeenCalledWith(expect.any(Error), {
      origen: "cliente",
      ruta: "/dashboard",
      extra: undefined,
    });
  });

  it("limita por la IP que puso el proxy, no por la que eligió el cliente", async () => {
    await POST(aviso("{}", { "x-forwarded-for": "6.6.6.6, 203.0.113.7" }));

    expect(intentar).toHaveBeenCalledWith("203.0.113.7");
  });

  it("pasado el límite responde 429 sin registrar nada", async () => {
    intentar.mockReturnValueOnce({ permitido: false });

    expect((await POST(aviso("{}"))).status).toBe(429);
    expect(capturar).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo de más de 8 KB", async () => {
    expect((await POST(aviso("x".repeat(9 * 1024)))).status).toBe(413);
    expect(capturar).not.toHaveBeenCalled();
  });

  it("recorta el mensaje, el stack y la ruta", async () => {
    await POST(
      aviso(
        JSON.stringify({
          mensaje: "m".repeat(900),
          stack: "s".repeat(5000),
          ruta: "r".repeat(400),
        }),
      ),
    );

    const [error, contexto] = capturar.mock.calls[0] as [
      Error,
      { ruta: string },
    ];
    expect(error.message).toHaveLength(500);
    expect(error.stack).toHaveLength(4000);
    expect(contexto.ruta).toHaveLength(300);
  });

  it("un JSON inválido se ignora sin romper", async () => {
    expect((await POST(aviso("{no es json"))).status).toBe(204);
    expect(capturar).not.toHaveBeenCalled();
  });
});
