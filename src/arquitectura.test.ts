import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Test de arquitectura: congela la regla de dependencias hacia adentro.
 *
 * Clean Architecture solo sirve mientras nadie la rompa, y una violación de
 * capa no falla al compilar: los path alias de tsconfig resuelven igual en
 * cualquier dirección. Este test convierte esa regla implícita en una que el
 * CI puede verificar.
 *
 *   Presentación (app, componentes, servidor)
 *       ↓
 *   Aplicación (servicios, DTOs)
 *       ↓
 *   Dominio (entidades, casos de uso, interfaces)   ← no depende de NADIE
 *       ↑
 *   Infraestructura (Prisma, adaptadores)  → implementa las interfaces
 *
 * Al momento de escribirlo, las tres capas internas tenían CERO violaciones.
 * El test existe para que siga siendo así, no para reportar deuda existente.
 */

const RAIZ = join(__dirname);

/** Extensiones que se analizan. */
const EXTENSIONES = [".ts", ".tsx"];

/** Devuelve todos los archivos fuente bajo `directorio`, recursivamente. */
function archivosFuente(directorio: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) {
      encontrados.push(...archivosFuente(ruta));
    } else if (EXTENSIONES.some((ext) => entrada.endsWith(ext))) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

/**
 * Especificadores de módulo importados por un archivo.
 *
 * Cubre las tres formas que usa el repo: `from "x"`, `import "x"` (efecto
 * secundario) e `import("x")` (dinámico, usado en instrumentation.ts).
 */
function importesDe(contenido: string): string[] {
  const especificadores: string[] = [];
  const patrones = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const patron of patrones) {
    for (const coincidencia of contenido.matchAll(patron)) {
      especificadores.push(coincidencia[1]!);
    }
  }
  return especificadores;
}

/** Ruta relativa a `src/`, con separadores normalizados para los mensajes. */
function ruta(absoluta: string): string {
  return relative(RAIZ, absoluta).split(sep).join("/");
}

/**
 * ¿Es código de test?
 *
 * Además de los `*.test.ts`, cuentan los módulos de soporte con prefijo `_`
 * (`_ayudas-test.ts`): no se empaquetan con la app y sí pueden usar vitest.
 */
function esArchivoDeTest(absoluta: string): boolean {
  const nombre = absoluta.split(sep).pop() ?? "";
  return /\.test\.tsx?$/.test(nombre) || /^_.*test.*\.tsx?$/.test(nombre);
}

/**
 * Recolecta las violaciones de una capa.
 *
 * @param capa        subcarpeta de src/ a revisar
 * @param prohibido   predicado: ¿este especificador está prohibido acá?
 * @param incluirTests si los .test.ts también deben cumplir la regla
 */
function violaciones(
  capa: string,
  prohibido: (especificador: string) => boolean,
  incluirTests = true,
): string[] {
  const encontradas: string[] = [];
  for (const archivo of archivosFuente(join(RAIZ, capa))) {
    if (!incluirTests && esArchivoDeTest(archivo)) continue;
    for (const especificador of importesDe(readFileSync(archivo, "utf8"))) {
      if (prohibido(especificador)) {
        encontradas.push(`${ruta(archivo)} → "${especificador}"`);
      }
    }
  }
  return encontradas;
}

/** ¿El especificador apunta a alguna de estas capas? */
function apuntaA(especificador: string, ...capas: string[]): boolean {
  return capas.some(
    (capa) =>
      especificador === `@/${capa}` || especificador.startsWith(`@/${capa}/`),
  );
}

describe("Arquitectura — dependencias hacia adentro", () => {
  it("el dominio no depende de NADA externo (ni capas, ni paquetes)", () => {
    // La regla más fuerte del sistema: el dominio es TypeScript puro. Solo
    // puede importar rutas relativas (sus propios módulos) y @/dominio/*.
    // `vitest` se permite únicamente en los archivos de test.
    const encontradas = violaciones(
      "dominio",
      (especificador) => {
        if (especificador.startsWith(".")) return false;
        if (apuntaA(especificador, "dominio")) return false;
        return true;
      },
      false,
    );

    expect(
      encontradas,
      mensaje("El dominio debe ser TypeScript puro", encontradas),
    ).toEqual([]);
  });

  it("los tests del dominio tampoco alcanzan capas externas", () => {
    const encontradas = violaciones("dominio", (especificador) =>
      apuntaA(
        especificador,
        "infraestructura",
        "servidor",
        "app",
        "componentes",
        "lib",
      ),
    );

    expect(
      encontradas,
      mensaje("Test del dominio con dependencia externa", encontradas),
    ).toEqual([]);
  });

  it("la aplicación solo depende del dominio", () => {
    const encontradas = violaciones("aplicacion", (especificador) =>
      apuntaA(
        especificador,
        "infraestructura",
        "servidor",
        "app",
        "componentes",
        "lib",
      ),
    );

    expect(
      encontradas,
      mensaje("La aplicación solo puede orquestar el dominio", encontradas),
    ).toEqual([]);
  });

  it("la infraestructura no depende de la presentación", () => {
    // La infraestructura implementa interfaces del dominio; que un adaptador
    // sepa de tRPC o de un componente invierte la dependencia.
    const encontradas = violaciones("infraestructura", (especificador) =>
      apuntaA(especificador, "servidor", "app", "componentes", "lib"),
    );

    expect(
      encontradas,
      mensaje(
        "La infraestructura no puede mirar hacia la presentación",
        encontradas,
      ),
    ).toEqual([]);
  });

  it("los componentes de UI no alcanzan la infraestructura ni el servidor", () => {
    // Los componentes hablan con el servidor por los hooks de tRPC. Un import
    // directo arrastraría Prisma o el contenedor al bundle del navegador.
    const encontradas = violaciones("componentes", (especificador) =>
      apuntaA(especificador, "infraestructura", "servidor"),
    );

    expect(
      encontradas,
      mensaje("Los componentes deben pasar por los hooks de tRPC", encontradas),
    ).toEqual([]);
  });
});

describe("Arquitectura — contención de Prisma", () => {
  it("Prisma solo se importa dentro de la infraestructura", () => {
    const fuera: string[] = [];
    for (const capa of [
      "dominio",
      "aplicacion",
      "servidor",
      "app",
      "componentes",
      "lib",
    ]) {
      for (const archivo of archivosFuente(join(RAIZ, capa))) {
        const contenido = readFileSync(archivo, "utf8");
        const importaPrisma = importesDe(contenido).some(
          (e) => e === "@prisma/client" || e.startsWith("@prisma/"),
        );
        if (importaPrisma) fuera.push(ruta(archivo));
      }
    }

    expect(
      fuera,
      mensaje("El ORM no puede filtrarse fuera de la infraestructura", fuera),
    ).toEqual([]);
  });
});

/** Arma un mensaje de fallo que se lee sin abrir el test. */
function mensaje(titulo: string, encontradas: string[]): string {
  return `${titulo}. Violaciones:\n  - ${encontradas.join("\n  - ")}`;
}
