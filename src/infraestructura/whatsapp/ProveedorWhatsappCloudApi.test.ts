import { describe, it, expect, vi, afterEach } from "vitest";
import {
  traducirRechazo,
  ProveedorWhatsappCloudApi,
} from "./ProveedorWhatsappCloudApi";

/**
 * Lo que devuelve la Cloud API cuando rechaza un envío va DERECHO a la
 * pantalla del profesional, como motivo del recordatorio fallido. Está escrito
 * en inglés y para quien mira el payload, no para quien quiere mandar un
 * turno.
 *
 * La regla de este traductor es la misma que la de `traducirErrorPrisma`: se
 * traduce lo que tiene una acción clara del otro lado y NADA más. Inventarle
 * una explicación a un rechazo que no conocemos manda a mirar donde no hay
 * nada, que es peor que el inglés.
 */
describe("traducirRechazo", () => {
  it("explica el rechazo por variables con nombre y dice qué hacer", () => {
    // El caso real: la plantilla se aprobó en Meta con variables con nombre
    // ({{nombre_paciente}}) y la app manda por posición ({{1}}, {{2}}). El
    // mensaje crudo no insinúa siquiera que el problema esté en la plantilla.
    const mensaje = traducirRechazo("Parameter name is missing or empty");

    expect(mensaje).toContain("variables CON NOMBRE");
    expect(mensaje).toContain("Administrador de WhatsApp");
    expect(mensaje).toContain("{{1}}");
  });

  it("conserva el texto original de Meta entre paréntesis", () => {
    // Sin el crudo no se puede googlear el error ni contrastarlo con la
    // documentación de Meta: la traducción agrega, no reemplaza.
    expect(traducirRechazo("Parameter name is missing or empty")).toContain(
      '"Parameter name is missing or empty"',
    );
  });

  it("deja pasar tal cual cualquier otro rechazo", () => {
    const otros = [
      "(#131047) Re-engagement message",
      "Template name does not exist in the translation",
      "WhatsApp rechazó el envío (HTTP 500).",
    ];

    for (const crudo of otros) {
      expect(traducirRechazo(crudo)).toBe(crudo);
    }
  });
});

describe("ProveedorWhatsappCloudApi.enviarPlantilla con botones", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("manda un componente por botón, con su índice y lo que necesita", async () => {
    const fetchFalso = vi.fn(
      async (_url: string, _init: { body: string }) =>
        new Response(JSON.stringify({ messages: [{ id: "wamid.X" }] })),
    );
    vi.stubGlobal("fetch", fetchFalso);

    const resultado = await new ProveedorWhatsappCloudApi(
      "token",
      "phone-1",
    ).enviarPlantilla({
      telefono: "5491155554444",
      nombrePlantilla: "recordatorio_botones",
      idioma: "es_AR",
      parametros: ["Juan"],
      textoEquivalente: "Hola Juan",
      botones: [
        { indice: 0, tipo: "QUICK_REPLY", payload: "CONFIRMAR_TURNO:tur-1" },
        { indice: 2, tipo: "URL", sufijo: "abc.firma" },
      ],
    });

    expect(resultado).toEqual({ modo: "API", idExterno: "wamid.X" });
    const cuerpo = JSON.parse(fetchFalso.mock.calls[0]![1].body) as {
      template: { components: unknown[] };
    };
    expect(cuerpo.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Juan" }] },
      {
        type: "button",
        sub_type: "quick_reply",
        // Meta lo pide como string.
        index: "0",
        parameters: [{ type: "payload", payload: "CONFIRMAR_TURNO:tur-1" }],
      },
      {
        type: "button",
        sub_type: "url",
        index: "2",
        parameters: [{ type: "text", text: "abc.firma" }],
      },
    ]);
  });
});
