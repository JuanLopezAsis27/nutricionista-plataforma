import { describe, it, expect, vi } from "vitest";
import { perezoso } from "./perezoso";

describe("perezoso", () => {
  it("no construye nada hasta que se lo pide", () => {
    const crear = vi.fn(() => ({ valor: 1 }));
    const obtener = perezoso(crear);

    // Es la propiedad que hace que importar el contenedor no instancie Prisma.
    expect(crear).not.toHaveBeenCalled();

    obtener();
    expect(crear).toHaveBeenCalledTimes(1);
  });

  it("construye una sola vez y devuelve siempre la misma instancia", () => {
    const crear = vi.fn(() => ({ valor: 1 }));
    const obtener = perezoso(crear);

    const primera = obtener();
    const segunda = obtener();

    expect(crear).toHaveBeenCalledTimes(1);
    // Identidad, no igualdad: los repositorios comparten el cliente de Prisma.
    expect(segunda).toBe(primera);
  });

  it("memoiza también los valores null", () => {
    // El caso que obliga a usar una bandera en vez de `??=`: los adaptadores
    // de Google valen null cuando no hay credenciales, y con `??=` se
    // reconstruirían en cada acceso.
    const crear = vi.fn(() => null);
    const obtener = perezoso(crear);

    expect(obtener()).toBeNull();
    expect(obtener()).toBeNull();
    expect(crear).toHaveBeenCalledTimes(1);
  });

  it("memoiza undefined con el mismo criterio", () => {
    const crear = vi.fn(() => undefined);
    const obtener = perezoso(crear);

    obtener();
    obtener();

    expect(crear).toHaveBeenCalledTimes(1);
  });

  it("no memoiza un fallo: el próximo intento vuelve a construir", () => {
    let intentos = 0;
    const obtener = perezoso(() => {
      intentos += 1;
      if (intentos === 1) throw new Error("falta una variable de entorno");
      return { valor: intentos };
    });

    expect(() => obtener()).toThrow("falta una variable de entorno");
    // Si se cacheara el fallo, un error transitorio dejaría la pieza rota
    // para siempre en un proceso de larga vida.
    expect(obtener()).toEqual({ valor: 2 });
  });
});
