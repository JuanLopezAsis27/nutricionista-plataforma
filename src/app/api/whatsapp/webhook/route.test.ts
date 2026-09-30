import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

/**
 * El único punto de la app que recibe datos sin sesión. Lo que se verifica es
 * el ORDEN: hasta que la firma no da con el app secret del consultorio dueño
 * del número, no se procesa nada, y lo que se procesa corre en SU inquilino.
 * La firma y el parseo en sí los cubre `infraestructura/whatsapp/webhook.test.ts`.
 */

const SECRETO = "app-secret-a";

const directorio = {
  verifyTokenValido: vi.fn(async (token: string) => token === "token-ok"),
  porPhoneNumberId: vi.fn(async (id: string) =>
    id === "phone-a"
      ? { nutricionistaId: "nutri-a", appSecret: SECRETO }
      : null,
  ),
  porWabaId: vi.fn(async () => null),
};
const whatsapp = {
  procesarEntrantes: vi.fn(async () => {}),
  registrarEstados: vi.fn(async () => {}),
};
const plantillas = { registrarEstadosMeta: vi.fn(async () => {}) };
vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  directorioWhatsapp: () => directorio,
  servicioWhatsapp: () => whatsapp,
  servicioRecordatorios: () => ({ plantillas }),
}));

const capturar = vi.fn();
vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: (...args: unknown[]) => capturar(...args) },
}));

const { alcanceActual } =
  await import("@/infraestructura/multitenancy/contextoTenant");
const { GET, POST } = await import("./route");

const URL_WEBHOOK = "https://app.nutri.com/api/whatsapp/webhook";

function payload(phoneNumberId: string): string {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-a",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: phoneNumberId },
              messages: [
                {
                  from: "5491100000000",
                  id: "wamid.1",
                  timestamp: "1752494400",
                  type: "text",
                  text: { body: "Hola" },
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

function firmar(cuerpo: string, secreto = SECRETO): string {
  return `sha256=${createHmac("sha256", secreto).update(cuerpo).digest("hex")}`;
}

function post(cuerpo: string, firma: string | null): Request {
  return new Request(URL_WEBHOOK, {
    method: "POST",
    body: cuerpo,
    headers: firma ? { "x-hub-signature-256": firma } : {},
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/whatsapp/webhook", () => {
  it("con la firma del consultorio dueño procesa DENTRO de su inquilino", async () => {
    let alcanceAlProcesar: unknown;
    whatsapp.procesarEntrantes.mockImplementationOnce(async () => {
      alcanceAlProcesar = alcanceActual();
    });
    const cuerpo = payload("phone-a");

    const respuesta = await POST(post(cuerpo, firmar(cuerpo)));

    expect(respuesta.status).toBe(200);
    expect(whatsapp.procesarEntrantes).toHaveBeenCalledOnce();
    expect(alcanceAlProcesar).toEqual({
      tipo: "nutricionista",
      nutricionistaId: "nutri-a",
    });
  });

  it("con una firma inválida responde 401 y no procesa nada", async () => {
    const cuerpo = payload("phone-a");

    const respuesta = await POST(post(cuerpo, firmar(cuerpo, "otro-secreto")));

    expect(respuesta.status).toBe(401);
    expect(whatsapp.procesarEntrantes).not.toHaveBeenCalled();
    expect(whatsapp.registrarEstados).not.toHaveBeenCalled();
    expect(plantillas.registrarEstadosMeta).not.toHaveBeenCalled();
  });

  it("sin cabecera de firma responde 401", async () => {
    const respuesta = await POST(post(payload("phone-a"), null));

    expect(respuesta.status).toBe(401);
    expect(whatsapp.procesarEntrantes).not.toHaveBeenCalled();
  });

  it("un cuerpo alterado después de firmar no pasa", async () => {
    const firmado = payload("phone-a");
    const alterado = firmado.replace("Hola", "Chau");

    const respuesta = await POST(post(alterado, firmar(firmado)));

    expect(respuesta.status).toBe(401);
  });

  it("un número que no es de ningún consultorio responde 404", async () => {
    const cuerpo = payload("phone-desconocido");

    const respuesta = await POST(post(cuerpo, firmar(cuerpo)));

    expect(respuesta.status).toBe(404);
    expect(whatsapp.procesarEntrantes).not.toHaveBeenCalled();
  });

  it("rechaza un JSON inválido y un cuerpo demasiado grande", async () => {
    expect((await POST(post("{no es json", null))).status).toBe(400);
    expect((await POST(post("x".repeat(129 * 1024), null))).status).toBe(413);
  });

  it("si el procesamiento falla responde 500 (Meta reintenta) y lo reporta", async () => {
    whatsapp.procesarEntrantes.mockRejectedValueOnce(new Error("base caída"));
    const cuerpo = payload("phone-a");

    const respuesta = await POST(post(cuerpo, firmar(cuerpo)));

    expect(respuesta.status).toBe(500);
    expect(capturar).toHaveBeenCalledOnce();
  });
});

describe("GET /api/whatsapp/webhook (handshake de Meta)", () => {
  function get(modo: string, token: string): Request {
    return new Request(
      `${URL_WEBHOOK}?hub.mode=${modo}&hub.verify_token=${token}&hub.challenge=desafio-123`,
    );
  }

  it("con un verify token válido devuelve el desafío", async () => {
    const respuesta = await GET(get("subscribe", "token-ok"));

    expect(respuesta.status).toBe(200);
    expect(await respuesta.text()).toBe("desafio-123");
  });

  it("con otro token o modo responde 403", async () => {
    expect((await GET(get("subscribe", "token-malo"))).status).toBe(403);
    expect((await GET(get("unsubscribe", "token-ok"))).status).toBe(403);
  });
});
