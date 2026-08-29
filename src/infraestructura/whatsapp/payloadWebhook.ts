import type { MensajeEntranteWhatsapp } from "@/dominio/casos-de-uso/whatsapp/ProcesarMensajeEntranteWhatsapp";
import type { EstadoEntregaWhatsapp } from "@/dominio/casos-de-uso/whatsapp/RegistrarEstadoWhatsapp";
import type { EstadoMensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";

/** Lo que interesa de un webhook de WhatsApp, ya desarmado. */
export interface WebhookWhatsapp {
  phoneNumberId: string | null;
  mensajes: MensajeEntranteWhatsapp[];
  estados: EstadoEntregaWhatsapp[];
}

const ESTADOS: Record<string, EstadoMensajeWhatsapp> = {
  sent: "ENVIADO",
  delivered: "ENTREGADO",
  read: "LEIDO",
  failed: "FALLIDO",
};

/**
 * Desarma el payload de la Cloud API. Es defensivo a propósito: viene de
 * afuera, cambia entre versiones de la API y trae tipos de mensaje que la app
 * no maneja (audio, ubicación, reacciones); todo lo que no sea texto se
 * ignora en silencio en vez de romper la ingesta.
 */
export function parsearWebhook(cuerpo: unknown): WebhookWhatsapp {
  const resultado: WebhookWhatsapp = {
    phoneNumberId: null,
    mensajes: [],
    estados: [],
  };

  for (const cambio of cambiosDe(cuerpo)) {
    const valor = objeto(cambio.value);
    if (!valor) continue;

    const metadata = objeto(valor.metadata);
    const phoneNumberId = texto(metadata?.phone_number_id);
    if (phoneNumberId) resultado.phoneNumberId = phoneNumberId;

    for (const bruto of arreglo(valor.messages)) {
      const mensaje = aMensajeEntrante(bruto);
      if (mensaje) resultado.mensajes.push(mensaje);
    }
    for (const bruto of arreglo(valor.statuses)) {
      const estado = aEstadoEntrega(bruto);
      if (estado) resultado.estados.push(estado);
    }
  }
  return resultado;
}

function aMensajeEntrante(
  bruto: Record<string, unknown>,
): MensajeEntranteWhatsapp | null {
  if (texto(bruto.type) !== "text") return null;

  const idExterno = texto(bruto.id);
  const telefono = texto(bruto.from);
  const cuerpo = texto(objeto(bruto.text)?.body);
  if (!idExterno || !telefono || !cuerpo) return null;

  // `timestamp` viene en segundos, como string.
  const segundos = Number(texto(bruto.timestamp));
  const enviadoEn =
    Number.isFinite(segundos) && segundos > 0
      ? new Date(segundos * 1000)
      : new Date();

  return { idExterno, telefono, cuerpo, enviadoEn };
}

function aEstadoEntrega(
  bruto: Record<string, unknown>,
): EstadoEntregaWhatsapp | null {
  const idExterno = texto(bruto.id);
  const estado = ESTADOS[texto(bruto.status) ?? ""];
  if (!idExterno || !estado) return null;

  const primerError = arreglo(bruto.errors)[0];
  return {
    idExterno,
    estado,
    error: primerError
      ? (texto(primerError.title) ?? texto(primerError.message))
      : null,
  };
}

function cambiosDe(cuerpo: unknown): Array<{ value: unknown }> {
  const raiz = objeto(cuerpo);
  return arreglo(raiz?.entry).flatMap((entrada) =>
    arreglo(entrada.changes).map((cambio) => ({ value: cambio.value })),
  );
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null;
}

function arreglo(valor: unknown): Record<string, unknown>[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (item): item is Record<string, unknown> => objeto(item) !== null,
  );
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.length > 0 ? valor : undefined;
}
