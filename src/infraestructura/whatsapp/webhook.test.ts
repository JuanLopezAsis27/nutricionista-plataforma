import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { firmaValida } from "./firmaWebhook";
import { parsearWebhook } from "./payloadWebhook";

const APP_SECRET = "secreto-de-la-app";

function firmar(cuerpo: string, secreto = APP_SECRET): string {
  return `sha256=${createHmac("sha256", secreto).update(cuerpo, "utf8").digest("hex")}`;
}

describe("firmaValida", () => {
  it("acepta un cuerpo firmado con el app secret correcto", () => {
    const cuerpo = '{"object":"whatsapp_business_account"}';
    expect(firmaValida(cuerpo, firmar(cuerpo), APP_SECRET)).toBe(true);
  });

  it("rechaza una firma hecha con otro secreto", () => {
    const cuerpo = '{"object":"whatsapp_business_account"}';
    expect(firmaValida(cuerpo, firmar(cuerpo, "otro"), APP_SECRET)).toBe(false);
  });

  // Por esto el webhook firma el texto crudo y no el JSON re-serializado.
  it("rechaza el cuerpo alterado después de firmar", () => {
    const firma = firmar('{"a":1}');
    expect(firmaValida('{"a":2}', firma, APP_SECRET)).toBe(false);
  });

  it("rechaza cuando falta la cabecera o el app secret", () => {
    const cuerpo = "{}";
    expect(firmaValida(cuerpo, null, APP_SECRET)).toBe(false);
    expect(firmaValida(cuerpo, firmar(cuerpo), null)).toBe(false);
    expect(firmaValida(cuerpo, "md5=algo", APP_SECRET)).toBe(false);
  });
});

describe("parsearWebhook", () => {
  const mensaje = {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: "123456" },
              messages: [
                {
                  from: "5491155554444",
                  id: "wamid.ABC",
                  timestamp: "1787000000",
                  type: "text",
                  text: { body: "Hola" },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  it("extrae el número del consultorio y el mensaje de texto", () => {
    const resultado = parsearWebhook(mensaje);

    expect(resultado.phoneNumberId).toBe("123456");
    expect(resultado.mensajes).toEqual([
      {
        telefono: "5491155554444",
        cuerpo: "Hola",
        idExterno: "wamid.ABC",
        enviadoEn: new Date(1787000000 * 1000),
        payloadBoton: null,
      },
    ]);
  });

  it("lee el toque de un botón: el texto va al chat y el payload a la acción", () => {
    const boton = structuredClone(mensaje) as unknown as {
      entry: {
        changes: { value: { messages: Record<string, unknown>[] } }[];
      }[];
    };
    boton.entry[0]!.changes[0]!.value.messages[0] = {
      from: "5491155554444",
      id: "wamid.BTN",
      timestamp: "1787000000",
      type: "button",
      button: { text: "Confirmo", payload: "CONFIRMAR_TURNO:tur-1" },
    };

    expect(parsearWebhook(boton).mensajes).toEqual([
      {
        telefono: "5491155554444",
        cuerpo: "Confirmo",
        idExterno: "wamid.BTN",
        enviadoEn: new Date(1787000000 * 1000),
        payloadBoton: "CONFIRMAR_TURNO:tur-1",
      },
    ]);
  });

  it("lee el cambio de estado de una plantilla, que trae la cuenta y no el número", () => {
    const resultado = parsearWebhook({
      entry: [
        {
          id: "waba-77",
          changes: [
            {
              field: "message_template_status_update",
              value: {
                event: "REJECTED",
                // Meta manda el id como número.
                message_template_id: 998877,
                message_template_name: "recordatorio_turno",
                message_template_language: "es_AR",
                reason: "INVALID_FORMAT",
              },
            },
          ],
        },
      ],
    });

    expect(resultado.phoneNumberId).toBeNull();
    expect(resultado.wabaId).toBe("waba-77");
    expect(resultado.estadosPlantillas).toEqual([
      {
        idMeta: "998877",
        nombre: "recordatorio_turno",
        idioma: "es_AR",
        estado: "RECHAZADA",
        motivo: expect.stringContaining("Formato inválido"),
      },
    ]);
  });

  it("ignora los tipos de mensaje que la app no maneja", () => {
    const audio = structuredClone(mensaje);
    audio.entry[0]!.changes[0]!.value.messages[0]!.type = "audio";

    expect(parsearWebhook(audio).mensajes).toHaveLength(0);
  });

  it("traduce los estados de entrega", () => {
    const resultado = parsearWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "123456" },
                statuses: [
                  { id: "wamid.ABC", status: "read" },
                  {
                    id: "wamid.DEF",
                    status: "failed",
                    errors: [{ title: "Fuera de ventana" }],
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(resultado.estados).toEqual([
      { idExterno: "wamid.ABC", estado: "LEIDO", error: null },
      { idExterno: "wamid.DEF", estado: "FALLIDO", error: "Fuera de ventana" },
    ]);
  });

  it("no rompe con un payload inesperado", () => {
    expect(parsearWebhook(null)).toEqual({
      phoneNumberId: null,
      wabaId: null,
      mensajes: [],
      estados: [],
      estadosPlantillas: [],
    });
    expect(parsearWebhook({ entry: "no es un arreglo" }).mensajes).toEqual([]);
  });
});
