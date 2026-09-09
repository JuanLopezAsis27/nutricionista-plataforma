import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { alcanceActual } from "@/infraestructura/multitenancy/contextoTenant";

/**
 * El contenedor se reemplaza por un doble: importarlo de verdad instanciaría
 * los 36 repositorios, el cliente S3 y los adaptadores de IA solo para probar
 * un despachador de trabajos. (Es, de paso, una muestra concreta de por qué
 * conviene volverlo perezoso — ver R4 en la auditoría de arquitectura.)
 */
const { usuarios } = vi.hoisted(() => ({
  usuarios: [] as { id: string; activo: boolean }[],
}));

vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  // Es un getter perezoso, no la instancia: devuelve el doble al invocarlo.
  repositorioUsuarioCompartido: () => ({
    listarPorRol: async () => usuarios,
  }),
}));

const { registrarTrabajoPorInquilino, colaDeInquilino, colaDeFallidos } =
  await import("./porInquilino");

/** PgBoss falso: registra colas y handlers, y deja invocarlos a mano. */
function crearBossFalso() {
  const colas = new Map<string, unknown>();
  const handlers = new Map<
    string,
    (trabajos: { data: unknown }[]) => Promise<unknown>
  >();
  const insertados: {
    cola: string;
    trabajos: { data: unknown; singletonKey?: string }[];
  }[] = [];
  const crons: { cola: string; cron: string }[] = [];

  const boss = {
    createQueue: async (nombre: string, opciones?: unknown) => {
      colas.set(nombre, opciones ?? null);
    },
    work: async (
      nombre: string,
      handler: (t: { data: unknown }[]) => Promise<unknown>,
    ) => {
      handlers.set(nombre, handler);
      return nombre;
    },
    insert: async (
      cola: string,
      trabajos: { data: unknown; singletonKey?: string }[],
    ) => {
      insertados.push({ cola, trabajos });
      return null;
    },
    schedule: async (cola: string, cron: string) => {
      crons.push({ cola, cron });
    },
  };

  return { boss, colas, handlers, insertados, crons };
}

describe("registrarTrabajoPorInquilino", () => {
  beforeEach(() => {
    usuarios.length = 0;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("declara las tres colas y el cron del despachador", async () => {
    const { boss, colas, crons } = crearBossFalso();

    await registrarTrabajoPorInquilino(boss as never, {
      nombre: "barrido",
      cron: "0 9 * * *",
      ejecutar: async () => 1,
      describir: () => "listo",
    });

    expect([...colas.keys()]).toEqual([
      "barrido",
      colaDeFallidos("barrido"),
      colaDeInquilino("barrido"),
    ]);
    expect(crons).toEqual([{ cola: "barrido", cron: "0 9 * * *" }]);
  });

  it("la cola por inquilino reintenta y deriva a la de fallidos", async () => {
    const { boss, colas } = crearBossFalso();

    await registrarTrabajoPorInquilino(boss as never, {
      nombre: "barrido",
      cron: "0 9 * * *",
      ejecutar: async () => 1,
      describir: () => "listo",
    });

    // Sin esto, un inquilino que agota reintentos desaparece sin dejar rastro.
    expect(colas.get(colaDeInquilino("barrido"))).toMatchObject({
      retryLimit: 3,
      retryBackoff: true,
      deadLetter: colaDeFallidos("barrido"),
    });
  });

  it("el despachador encola un trabajo por inquilino ACTIVO", async () => {
    usuarios.push(
      { id: "nutri-1", activo: true },
      { id: "nutri-2", activo: false },
      { id: "nutri-3", activo: true },
    );
    const { boss, handlers, insertados } = crearBossFalso();

    await registrarTrabajoPorInquilino(boss as never, {
      nombre: "barrido",
      cron: "0 9 * * *",
      ejecutar: async () => 1,
      describir: () => "listo",
    });
    await handlers.get("barrido")!([]);

    expect(insertados).toHaveLength(1);
    expect(insertados[0]!.cola).toBe(colaDeInquilino("barrido"));
    expect(insertados[0]!.trabajos.map((t) => t.data)).toEqual([
      { nutricionistaId: "nutri-1" },
      { nutricionistaId: "nutri-3" },
    ]);
    // El singletonKey evita que se apilen corridas del mismo consultorio.
    expect(insertados[0]!.trabajos.map((t) => t.singletonKey)).toEqual([
      "nutri-1",
      "nutri-3",
    ]);
  });

  it("no encola nada si no hay inquilinos activos", async () => {
    usuarios.push({ id: "nutri-1", activo: false });
    const { boss, handlers, insertados } = crearBossFalso();

    await registrarTrabajoPorInquilino(boss as never, {
      nombre: "barrido",
      cron: "0 9 * * *",
      ejecutar: async () => 1,
      describir: () => "listo",
    });
    await handlers.get("barrido")!([]);

    expect(insertados).toEqual([]);
  });

  it("ejecuta cada trabajo dentro del alcance de SU inquilino", async () => {
    const { boss, handlers } = crearBossFalso();
    const alcances: (string | undefined)[] = [];

    await registrarTrabajoPorInquilino(boss as never, {
      nombre: "barrido",
      cron: "0 9 * * *",
      ejecutar: async () => {
        const alcance = alcanceActual();
        alcances.push(
          alcance?.tipo === "nutricionista"
            ? alcance.nutricionistaId
            : undefined,
        );
        return 1;
      },
      describir: () => "listo",
    });

    const trabajar = handlers.get(colaDeInquilino("barrido"))!;
    await trabajar([{ data: { nutricionistaId: "nutri-1" } }]);
    await trabajar([{ data: { nutricionistaId: "nutri-2" } }]);

    // Es lo que impide que un barrido escriba en el consultorio equivocado.
    expect(alcances).toEqual(["nutri-1", "nutri-2"]);
  });

  it("propaga el fallo de un inquilino para que pg-boss lo reintente", async () => {
    const { boss, handlers } = crearBossFalso();

    await registrarTrabajoPorInquilino(boss as never, {
      nombre: "barrido",
      cron: "0 9 * * *",
      ejecutar: async () => {
        throw new Error("SMTP caído");
      },
      describir: () => "listo",
    });

    // Antes, el fallo de un inquilino cortaba el barrido de todos los demás.
    // Ahora sube tal cual y solo reintenta ESTE trabajo.
    await expect(
      handlers.get(colaDeInquilino("barrido"))!([
        { data: { nutricionistaId: "nutri-1" } },
      ]),
    ).rejects.toThrow("SMTP caído");
  });
});
