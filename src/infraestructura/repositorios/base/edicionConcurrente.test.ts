import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { enVersion, guardandoVersion } from "./edicionConcurrente";
import { ErrorEdicionConcurrente } from "@/dominio/errores/ErrorEdicionConcurrente";

/**
 * El bloqueo optimista tiene dos mitades y las dos se pueden romper en
 * silencio: el WHERE que impone la condición, y la traducción del "no encontré
 * la fila" de Prisma al conflicto del dominio.
 *
 * Si la primera se rompe, la escritura entra igual y vuelve el lost update. Si
 * se rompe la segunda, el profesional ve «el registro ya no existe» —el
 * mensaje genérico de P2025— cuando en realidad su ficha sigue ahí y lo que
 * pasó es que alguien la editó antes.
 */

const CONFLICTO = new Prisma.PrismaClientKnownRequestError("no rows", {
  code: "P2025",
  clientVersion: "6.2.0",
});

const VERSION = new Date("2026-03-01T10:00:00.000Z");

describe("enVersion", () => {
  it("sin testigo, el WHERE es el de siempre", () => {
    // Las mutaciones de un campo (archivar, marcar la bienvenida) no tienen de
    // dónde sacar el testigo y tienen que poder escribir.
    expect(enVersion("pac-1", undefined)).toEqual({ id: "pac-1" });
  });

  it("con testigo, el WHERE exige la versión", () => {
    // Acá está toda la garantía: la condición viaja al UPDATE. Comparar antes
    // de escribir dejaría una ventana entre el chequeo y la escritura.
    expect(enVersion("pac-1", VERSION)).toEqual({
      id: "pac-1",
      actualizadoEn: VERSION,
    });
  });
});

describe("guardandoVersion", () => {
  it("devuelve lo escrito cuando la versión coincide", async () => {
    const resultado = await guardandoVersion(
      "La ficha",
      VERSION,
      async () => "ok",
    );
    expect(resultado).toBe("ok");
  });

  it("traduce el P2025 al conflicto de edición", async () => {
    await expect(
      guardandoVersion("La ficha del paciente", VERSION, () => {
        throw CONFLICTO;
      }),
    ).rejects.toBeInstanceOf(ErrorEdicionConcurrente);
  });

  it("el mensaje dice que los cambios NO se guardaron", async () => {
    // Es la mitad del dato: el profesional tiene sus cambios en pantalla y
    // necesita saber que no entraron antes de cerrar el diálogo.
    let mensaje = "";
    try {
      await guardandoVersion("La receta", VERSION, () => {
        throw CONFLICTO;
      });
    } catch (error) {
      mensaje = (error as Error).message;
    }

    expect(mensaje).toContain("La receta");
    expect(mensaje).toContain("NO se guardaron");
    expect(mensaje).toContain("recargá");
  });

  it("SIN testigo deja pasar el P2025 tal cual", async () => {
    // Sin bloqueo optimista, un P2025 es lo que dice ser —la fila no está— y
    // lo traduce `traducirErrorPrisma` con su propio mensaje. Convertirlo en
    // conflicto de edición mandaría a recargar por algo que se borró.
    await expect(
      guardandoVersion("La ficha", undefined, () => {
        throw CONFLICTO;
      }),
    ).rejects.toBe(CONFLICTO);
  });

  it("cualquier otro fallo se propaga sin tocar", async () => {
    const caida = new Error("la base se cayó");
    await expect(
      guardandoVersion("La ficha", VERSION, () => {
        throw caida;
      }),
    ).rejects.toBe(caida);
  });
});
