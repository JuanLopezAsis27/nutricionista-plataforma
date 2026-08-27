import { servicioWhatsapp, directorioWhatsapp } from "@/infraestructura/contenedor/contenedor";
import { ejecutarEnNutricionista } from "@/infraestructura/multitenancy/contextoTenant";
import { firmaValida } from "@/infraestructura/whatsapp/firmaWebhook";
import { parsearWebhook } from "@/infraestructura/whatsapp/payloadWebhook";
import { monitorErrores } from "@/infraestructura/monitoreo/monitor";

/**
 * Webhook de la Cloud API de WhatsApp (Meta).
 *
 * Es el único punto de la app que recibe datos sin sesión, así que el orden
 * importa: se resuelve el inquilino por `phone_number_id`, se valida la firma
 * con SU app secret y recién entonces se procesa, todo dentro de
 * `ejecutarEnNutricionista` (`conAlcanceDeSesion` no sirve acá: no hay sesión).
 *
 * Los mensajes de números que no son de pacientes del inquilino se descartan
 * en la ingesta y nunca se persisten.
 */
export const runtime = "nodejs";

const MAX_BYTES = 128 * 1024;

/** Handshake de verificación: Meta pide la URL con el token que configuró el profesional. */
export async function GET(peticion: Request): Promise<Response> {
  const parametros = new URL(peticion.url).searchParams;
  const modo = parametros.get("hub.mode");
  const token = parametros.get("hub.verify_token") ?? "";
  const desafio = parametros.get("hub.challenge") ?? "";

  if (modo !== "subscribe" || !(await directorioWhatsapp().verifyTokenValido(token))) {
    return new Response(null, { status: 403 });
  }
  return new Response(desafio, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

export async function POST(peticion: Request): Promise<Response> {
  // La firma se calcula sobre el cuerpo CRUDO: hay que leerlo como texto y no
  // re-serializar el JSON, o el HMAC nunca coincide.
  const crudo = await peticion.text();
  if (crudo.length > MAX_BYTES) {
    return new Response(null, { status: 413 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(crudo);
  } catch {
    return new Response(null, { status: 400 });
  }

  const webhook = parsearWebhook(cuerpo);
  if (!webhook.phoneNumberId) {
    return new Response(null, { status: 400 });
  }

  // Se parsea antes de validar solo para saber a quién pertenece el webhook;
  // hasta que la firma no da, no se escribe absolutamente nada.
  const inquilino = await directorioWhatsapp().porPhoneNumberId(webhook.phoneNumberId);
  if (!inquilino) {
    return new Response(null, { status: 404 });
  }
  if (!firmaValida(crudo, peticion.headers.get("x-hub-signature-256"), inquilino.appSecret)) {
    return new Response(null, { status: 401 });
  }

  try {
    await ejecutarEnNutricionista(inquilino.nutricionistaId, async () => {
      await servicioWhatsapp().procesarEntrantes(webhook.mensajes);
      await servicioWhatsapp().registrarEstados(webhook.estados);
    });
  } catch (error) {
    monitorErrores.capturar(error instanceof Error ? error : new Error(String(error)), {
      origen: "whatsapp-webhook",
    });
    // Un 500 hace que Meta reintente; la ingesta es idempotente por wamid.
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}
