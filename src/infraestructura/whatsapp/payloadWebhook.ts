import type { MensajeEntranteWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/ProcesarMensajeEntranteWhatsapp";
import type { EstadoEntregaWhatsapp } from "@/aplicacion/casos-de-uso/whatsapp/RegistrarEstadoWhatsapp";
import type { EstadoMensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import type { EstadoPlantillaRemota } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import { estadoDesdeMeta, motivoDesdeMeta } from "./estadosPlantillaMeta";

/** Lo que interesa de un webhook de WhatsApp, ya desarmado. */
export interface WebhookWhatsapp {
  phoneNumberId: string | null;
  /**
   * Id de la cuenta de WhatsApp Business (`entry[].id`). Es la única pista
   * de a quién pertenece un aviso de estado de plantilla, que no trae número.
   */
  wabaId: string | null;
  mensajes: MensajeEntranteWhatsapp[];
  estados: EstadoEntregaWhatsapp[];
  /** Cambios de estado de revisión de plantillas (`message_template_status_update`). */
  estadosPlantillas: EstadoPlantillaRemota[];
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
 * no maneja (audio, ubicación, reacciones); todo lo que no sea texto o el
 * toque de un botón se ignora en silencio en vez de romper la ingesta.
 */
export function parsearWebhook(cuerpo: unknown): WebhookWhatsapp {
  const resultado: WebhookWhatsapp = {
    phoneNumberId: null,
    wabaId: null,
    mensajes: [],
    estados: [],
    estadosPlantillas: [],
  };

  for (const cambio of cambiosDe(cuerpo)) {
    if (cambio.wabaId) resultado.wabaId = cambio.wabaId;
    const valor = objeto(cambio.value);
    if (!valor) continue;

    if (cambio.campo === "message_template_status_update") {
      const estado = aEstadoPlantilla(valor);
      if (estado) resultado.estadosPlantillas.push(estado);
      continue;
    }

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
  const tipo = texto(bruto.type);
  const idExterno = texto(bruto.id);
  const telefono = texto(bruto.from);

  let cuerpo: string | undefined;
  let payloadBoton: string | null = null;
  if (tipo === "text") {
    cuerpo = texto(objeto(bruto.text)?.body);
  } else if (tipo === "button") {
    // El paciente tocó una respuesta rápida de una plantilla: llega el texto
    // del botón (lo que se ve en el chat) y el payload que puso la app al
    // enviarla (qué hacer, y con qué turno).
    const boton = objeto(bruto.button);
    cuerpo = texto(boton?.text);
    payloadBoton = texto(boton?.payload) ?? null;
  }
  if (!idExterno || !telefono || !cuerpo) return null;

  // `timestamp` viene en segundos, como string.
  const segundos = Number(texto(bruto.timestamp));
  const enviadoEn =
    Number.isFinite(segundos) && segundos > 0
      ? new Date(segundos * 1000)
      : new Date();

  return { idExterno, telefono, cuerpo, enviadoEn, payloadBoton };
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

function aEstadoPlantilla(
  valor: Record<string, unknown>,
): EstadoPlantillaRemota | null {
  const estado = estadoDesdeMeta(texto(valor.event));
  // El id de la plantilla viene como número en el JSON de Meta.
  const idCrudo = valor.message_template_id;
  const idMeta = typeof idCrudo === "number" ? String(idCrudo) : texto(idCrudo);
  const nombre = texto(valor.message_template_name);
  const idioma = texto(valor.message_template_language);
  if (!estado || !idMeta || !nombre || !idioma) return null;
  return {
    idMeta,
    nombre,
    idioma,
    estado,
    motivo: motivoDesdeMeta(texto(valor.reason)),
  };
}

function cambiosDe(cuerpo: unknown): Array<{
  value: unknown;
  campo: string | undefined;
  wabaId: string | undefined;
}> {
  const raiz = objeto(cuerpo);
  return arreglo(raiz?.entry).flatMap((entrada) =>
    arreglo(entrada.changes).map((cambio) => ({
      value: cambio.value,
      campo: texto(cambio.field),
      wabaId: texto(entrada.id),
    })),
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
