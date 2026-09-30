import { describe, it, expect } from "vitest";
import {
  opcionesCookieRefresco,
  opcionesBorradoCookieRefresco,
} from "./cookieRefresco";

describe("cookie de refresco", () => {
  it("es httpOnly, lax y de toda la app", () => {
    const opciones = opcionesCookieRefresco(new Date("2026-08-13T12:00:00Z"));
    expect(opciones).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(opciones.expires).toEqual(new Date("2026-08-13T12:00:00Z"));
  });

  it("se borra con las MISMAS opciones con que se escribe", () => {
    // Con un path o un sameSite distinto, el navegador trata el borrado como
    // otra cookie y la de refresco sigue viva.
    const { expires: _e, ...alta } = opcionesCookieRefresco(new Date());
    const { maxAge, ...borrado } = opcionesBorradoCookieRefresco();
    expect(borrado).toEqual(alta);
    expect(maxAge).toBe(0);
  });
});
