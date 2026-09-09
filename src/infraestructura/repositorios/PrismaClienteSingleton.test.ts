import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { MODELOS_INQUILINO } from "./PrismaClienteSingleton";

/**
 * Guardia contra el modo silencioso en que falla el aislamiento multi-inquilino.
 *
 * `MODELOS_INQUILINO` es la lista que la extensión de Prisma usa para filtrar
 * por `nutricionistaId`. Si alguien agrega la columna a una tabla nueva y se
 * olvida de sumarla acá, esa tabla queda accesible por id desde cualquier
 * consultorio y nada lo delata: no hay error, solo datos de más.
 *
 * Este test compara la lista contra el schema y falla si se separan.
 */
describe("MODELOS_INQUILINO", () => {
  const schema = readFileSync("prisma/schema.prisma", "utf8");

  /** Modelos del schema que tienen la columna de inquilino. */
  const conColumna = [...schema.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)]
    .filter(([, , cuerpo]) => /^\s*nutricionistaId\s+String/m.test(cuerpo!))
    .map(([, nombre]) => nombre!);

  it("cubre todas las tablas que tienen columna de inquilino", () => {
    const faltantes = conColumna.filter((m) => !MODELOS_INQUILINO.has(m));
    expect(faltantes).toEqual([]);
  });

  it("no declara tablas que no tienen la columna", () => {
    const sobrantes = [...MODELOS_INQUILINO].filter(
      (m) => !conColumna.includes(m),
    );
    expect(sobrantes).toEqual([]);
  });

  it("encuentra las tablas de inquilino en el schema (el regex sigue sirviendo)", () => {
    // Si el parseo se rompiera, los dos tests de arriba pasarían en vacío.
    expect(conColumna.length).toBeGreaterThan(40);
    expect(conColumna).toContain("Paciente");
    expect(conColumna).toContain("Archivo");
  });
});
