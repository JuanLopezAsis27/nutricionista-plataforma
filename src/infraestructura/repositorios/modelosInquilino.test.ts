import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MODELOS_INQUILINO } from "./PrismaClienteSingleton";

/**
 * Sincronización entre `schema.prisma` y `MODELOS_INQUILINO`.
 *
 * El aislamiento multi-inquilino se apoya en un Set escrito a mano: la
 * extensión de Prisma solo filtra por `nutricionistaId` los modelos que
 * figuran ahí. Un modelo con la columna que no esté en el Set NO se filtra, y
 * sus consultas por id cruzan datos entre consultorios.
 *
 * Ese fallo es silencioso y hacia el lado inseguro (devuelve datos de más),
 * no lo detecta el compilador y no lo detectaba ningún test. Ya ocurrió una
 * vez: hasta la migración 27, las hijas del agregado (`Archivo`, `Mensaje`,
 * `ComidaPlan`, …) quedaban fuera del filtro.
 *
 * Este test lee el schema como fuente de verdad y falla si las dos listas se
 * separan, en cualquiera de las dos direcciones.
 */

const RUTA_SCHEMA = join(
  __dirname,
  "..",
  "..",
  "..",
  "prisma",
  "schema.prisma",
);

/**
 * Modelos del schema que declaran la columna `nutricionistaId`.
 *
 * Se busca la DECLARACIÓN del campo (la línea empieza con el nombre), no
 * cualquier mención: `nutricionistaId` también aparece en los `@relation`,
 * `@@unique` y `@@index` de los mismos modelos.
 */
function modelosConColumnaDeInquilino(schema: string): Set<string> {
  const modelos = new Set<string>();
  let modeloActual: string | null = null;

  for (const linea of schema.split(/\r?\n/)) {
    const recortada = linea.trim();

    const apertura = /^model\s+(\w+)\s*\{/.exec(recortada);
    if (apertura) {
      modeloActual = apertura[1]!;
      continue;
    }
    if (recortada === "}") {
      modeloActual = null;
      continue;
    }
    if (modeloActual && /^nutricionistaId\s+String\b/.test(recortada)) {
      modelos.add(modeloActual);
    }
  }

  return modelos;
}

describe("MODELOS_INQUILINO vs schema.prisma", () => {
  const schema = readFileSync(RUTA_SCHEMA, "utf8");
  const enElSchema = modelosConColumnaDeInquilino(schema);

  it("el schema declara al menos un modelo de inquilino (el parser funciona)", () => {
    // Red de seguridad del propio test: si el formato del schema cambiara y el
    // parser dejara de encontrar nada, las dos comparaciones de abajo pasarían
    // en vacío y el test quedaría verde sin verificar nada.
    expect(enElSchema.size).toBeGreaterThan(30);
    expect(enElSchema.has("Paciente")).toBe(true);
    expect(enElSchema.has("Nutricionista")).toBe(false);
  });

  it("todo modelo con `nutricionistaId` está en MODELOS_INQUILINO", () => {
    const faltantes = [...enElSchema]
      .filter((m) => !MODELOS_INQUILINO.has(m))
      .sort();

    expect(
      faltantes,
      "Estos modelos tienen columna de inquilino pero la extensión de Prisma NO los " +
        "filtra: sus consultas por id cruzan datos entre consultorios. Agregalos a " +
        "MODELOS_INQUILINO en PrismaClienteSingleton.ts →\n  " +
        faltantes.join("\n  "),
    ).toEqual([]);
  });

  it("MODELOS_INQUILINO no nombra modelos inexistentes o sin la columna", () => {
    const sobrantes = [...MODELOS_INQUILINO]
      .filter((m) => !enElSchema.has(m))
      .sort();

    expect(
      sobrantes,
      "Estos modelos están en MODELOS_INQUILINO pero no declaran `nutricionistaId` " +
        "en el schema (se renombraron, se borraron o nunca fueron de inquilino). La " +
        "extensión les agregaría un filtro por una columna que no existe →\n  " +
        sobrantes.join("\n  "),
    ).toEqual([]);
  });
});
