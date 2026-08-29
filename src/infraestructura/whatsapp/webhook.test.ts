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
      mensajes: [],
      estados: [],
    });
    expect(parsearWebhook({ entry: "no es un arreglo" }).mensajes).toEqual([]);
  });
});
