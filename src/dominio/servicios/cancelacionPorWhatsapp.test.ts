import { describe, it, expect } from "vitest";
import {
  enlaceCancelacionPorWhatsapp,
  sufijoCancelacionPorWhatsapp,
  PREFIJO_WA_ME,
} from "./cancelacionPorWhatsapp";

const VARIABLES = { paciente: "Ana García", fecha: "15/07", hora: "10:30" };

function textoDe(enlace: string): string {
  return new URL(enlace).searchParams.get("text") ?? "";
}

describe("cancelación por WhatsApp", () => {
  it("sin mensaje propio usa el de por defecto con los datos del turno", () => {
    const enlace = enlaceCancelacionPorWhatsapp(
      "5491122223333",
      null,
      VARIABLES,
    );

    expect(enlace.startsWith(`${PREFIJO_WA_ME}5491122223333?text=`)).toBe(true);
    expect(textoDe(enlace)).toBe(
      "Hola, soy Ana García. No voy a poder asistir a mi turno del 15/07 a las 10:30, quiero cancelarlo.",
    );
  });

  it("un mensaje en blanco cuenta como sin mensaje", () => {
    expect(
      textoDe(enlaceCancelacionPorWhatsapp("549", "   ", VARIABLES)),
    ).toMatch(/^Hola, soy Ana García/);
  });

  it("usa el mensaje del consultorio y codifica lo que rompería la URL", () => {
    const enlace = enlaceCancelacionPorWhatsapp(
      "549",
      "Cancelo {{fecha}} & {{hora}}? #turno",
      VARIABLES,
    );

    // Sin codificar, «&» y «#» cortarían el texto en el navegador.
    expect(textoDe(enlace)).toBe("Cancelo 15/07 & 10:30? #turno");
  });

  it("el email y el botón de Meta abren el MISMO chat con el MISMO texto", () => {
    // El botón se registra como `https://wa.me/{{1}}` y recibe el sufijo.
    const sufijo = sufijoCancelacionPorWhatsapp("549", null, VARIABLES);
    expect(`${PREFIJO_WA_ME}${sufijo}`).toBe(
      enlaceCancelacionPorWhatsapp("549", null, VARIABLES),
    );
  });
});
