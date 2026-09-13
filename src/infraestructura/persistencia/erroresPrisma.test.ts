import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { traducirErrorPrisma } from "./erroresPrisma";

/**
 * Estos son los errores que el usuario veía como «Ocurrió un error
 * inesperado. Volvé a intentarlo en unos minutos.» — un mensaje que miente dos
 * veces, porque ni es inesperado ni se arregla reintentando.
 */
function errorPrisma(code: string, target?: string[] | string) {
  return new Prisma.PrismaClientKnownRequestError("mensaje interno de Prisma", {
    code,
    clientVersion: "6.0.0",
    meta: target === undefined ? undefined : { target },
  });
}

describe("traducirErrorPrisma", () => {
  it("P2002 (repetido) nombra el campo en castellano", () => {
    const traducido = traducirErrorPrisma(errorPrisma("P2002", ["email"]));

    expect(traducido?.codigo).toBe("CONFLICTO");
    expect(traducido?.message).toContain("email");
  });

  it("P2002 con varios campos los enumera", () => {
    const traducido = traducirErrorPrisma(
      errorPrisma("P2002", ["nombre", "telefono"]),
    );

    expect(traducido?.message).toContain("nombre");
    expect(traducido?.message).toContain("teléfono");
  });

  it("P2002 con un campo desconocido dice «dato», no inventa un nombre", () => {
    // Nombrar mal el campo manda a alguien a corregir el que no era, que es
    // peor que no nombrarlo.
    const traducido = traducirErrorPrisma(errorPrisma("P2002", ["columnaX"]));

    expect(traducido?.message).toContain("dato");
    expect(traducido?.message).not.toContain("columnaX");
  });

  it("P2002 sin meta tampoco rompe", () => {
    expect(traducirErrorPrisma(errorPrisma("P2002"))?.codigo).toBe("CONFLICTO");
  });

  it("P2025 (ya no existe) sale como NO_ENCONTRADO", () => {
    const traducido = traducirErrorPrisma(errorPrisma("P2025"));

    expect(traducido?.codigo).toBe("NO_ENCONTRADO");
    expect(traducido?.message).toMatch(/ya no existe/i);
  });

  it("P2003 (relación rota) sale como VALIDACION", () => {
    expect(traducirErrorPrisma(errorPrisma("P2003"))?.codigo).toBe(
      "VALIDACION",
    );
  });

  it("P2014 (tiene hijos colgando) sale como CONFLICTO", () => {
    expect(traducirErrorPrisma(errorPrisma("P2014"))?.codigo).toBe("CONFLICTO");
  });

  it("un código que no sabemos explicar NO se traduce", () => {
    // Deliberado: para un problema real de infraestructura, el genérico es la
    // respuesta correcta. Inventar una explicación sería peor que no darla.
    expect(traducirErrorPrisma(errorPrisma("P1001"))).toBeNull();
  });

  it("un Error común no se traduce", () => {
    expect(traducirErrorPrisma(new Error("boom"))).toBeNull();
    expect(traducirErrorPrisma("no soy un error")).toBeNull();
    expect(traducirErrorPrisma(null)).toBeNull();
  });

  it("nunca deja pasar el mensaje interno de Prisma al usuario", () => {
    // Es la mitad de seguridad del asunto: esos mensajes traen nombres de
    // tabla, de columna y a veces el host de la base.
    for (const codigo of ["P2002", "P2003", "P2014", "P2025"]) {
      const traducido = traducirErrorPrisma(errorPrisma(codigo, ["email"]));
      expect(traducido?.message).not.toContain("mensaje interno de Prisma");
    }
  });
});
