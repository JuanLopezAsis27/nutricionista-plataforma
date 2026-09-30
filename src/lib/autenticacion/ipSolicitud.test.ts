import { describe, it, expect } from "vitest";
import { ipDeSolicitud } from "./ipSolicitud";

function peticion(cabeceras: Record<string, string>): Request {
  return new Request("https://app.nutri.com/login", { headers: cabeceras });
}

describe("ipDeSolicitud", () => {
  it("prefiere X-Real-IP, que lo escribe nginx pisando lo que venga de afuera", () => {
    expect(
      ipDeSolicitud(
        peticion({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }),
      ),
    ).toBe("9.9.9.9");
  });

  it("de X-Forwarded-For toma el ÚLTIMO, no el que eligió el cliente", () => {
    // El primero lo controla el atacante: leerlo daba un contador nuevo en
    // cada intento y el bloqueo por IP no se disparaba nunca.
    expect(
      ipDeSolicitud(
        peticion({ "x-forwarded-for": "6.6.6.6, 10.0.0.1 , 203.0.113.7" }),
      ),
    ).toBe("203.0.113.7");
  });

  it("sin cabeceras, o sin request, cae en un valor fijo", () => {
    expect(ipDeSolicitud(peticion({}))).toBe("desconocida");
    expect(ipDeSolicitud(undefined)).toBe("desconocida");
    expect(ipDeSolicitud(peticion({ "x-forwarded-for": " , " }))).toBe(
      "desconocida",
    );
  });
});
