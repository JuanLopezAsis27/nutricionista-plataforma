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
 *   Aplicación (casos de uso, servicios, DTOs)
 *       ↓
 *   Dominio (entidades, interfaces, servicios de dominio)  ← no depende de NADIE
 *       ↑
 *   Infraestructura (Prisma, adaptadores)  → implementa las interfaces
 *
 * Al momento de escribirlo, las tres capas internas tenían CERO violaciones.
 * El test existe para que siga siendo así, no para reportar deuda existente.
 *
 * ## Sobre los casos de uso
 *
 * Vivían en `dominio/casos-de-uso/` y se movieron a `aplicacion/casos-de-uso/`,
 * que es donde los ubica la convención: Clean Architecture los llama
 * "Application Business Rules" y DDD, *application services*. La regla de
 * dependencia se cumplía igual antes del movimiento —importaban solo del
 * dominio— pero el nombre de la carpeta decía otra cosa.
 *
 * El movimiento tiene una contrapartida que hay que reponer a mano: mientras
 * estuvieron en `dominio/`, la regla de "dominio puro" les impedía **gratis**
 * importar un DTO de la capa de aplicación. En `aplicacion/` esa protección se
 * pierde, y con ella la propiedad que hace testeables a los casos de uso sin
 * levantar medio sistema. Por eso existe el test "los casos de uso no dependen
 * de los DTOs ni de los servicios de aplicación": es la garantía que el
 * movimiento se llevó puesta, vuelta a poner de forma explícita.
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

  it("los casos de uso no dependen de los DTOs ni de los servicios de aplicación", () => {
    // Esta es la garantía que se perdió al mover los casos de uso de `dominio/`
    // a `aplicacion/`: allá la regla de "dominio puro" se la daba gratis.
    //
    // Importa por dos motivos concretos. Uno: un caso de uso que recibe un DTO
    // queda atado a la forma que la UI necesita hoy, y deja de poder invocarse
    // desde el worker o desde otro caso de uso sin arrastrar esa forma. Dos: es
    // lo que permite testearlos con un objeto plano y un mock de repositorio,
    // sin levantar Zod ni la capa de servicios.
    //
    // Hoy CADA caso de uso define su propio tipo de entrada (por ejemplo
    // `DatosNuevoPacienteConAcceso`), y el servicio de aplicación es quien
    // traduce del DTO a ese tipo. Este test congela ese reparto.
    const encontradas: string[] = [];
    const casosDeUso = join(RAIZ, "aplicacion", "casos-de-uso");

    for (const archivo of archivosFuente(casosDeUso)) {
      for (const especificador of importesDe(readFileSync(archivo, "utf8"))) {
        if (
          apuntaA(especificador, "aplicacion/dtos") ||
          apuntaA(especificador, "aplicacion/servicios")
        ) {
          encontradas.push(`${ruta(archivo)} → "${especificador}"`);
        }
      }
    }

    expect(
      encontradas,
      mensaje(
        "Un caso de uso define su propia entrada; el servicio traduce el DTO",
        encontradas,
      ),
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
