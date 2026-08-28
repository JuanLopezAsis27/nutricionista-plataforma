import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { EventoTiempoReal } from "@/dominio/servicios/IBusEventos";

/**
 * Cliente `pg` falso.
 *
 * Deja disparar a mano los eventos "error"/"end" que en producción manda el
 * driver cuando Postgres se reinicia, y registrar qué consultas recibió cada
 * conexión (para distinguir la original de la que la reemplaza).
 *
 * El emisor está escrito a mano en vez de extender `node:events`: la fábrica
 * de `vi.hoisted` se eleva por encima de los imports del módulo, así que acá
 * dentro no hay nada importado disponible todavía.
 */
const { ClienteFalso, instancias, control } = vi.hoisted(() => {
  const control = { fallarTodasLasConsultas: false };

  class ClienteFalso {
    private readonly manejadores = new Map<
      string,
      ((dato: unknown) => void)[]
    >();
    consultas: string[] = [];
    conectado = false;
    fallarConsulta = false;
    terminado = false;

    constructor() {
      instancias.push(this);
    }

    on(evento: string, manejador: (dato: unknown) => void): this {
      const lista = this.manejadores.get(evento) ?? [];
      lista.push(manejador);
      this.manejadores.set(evento, lista);
      return this;
    }

    /** Simula un evento del driver (lo usa el test, no el código productivo). */
    emit(evento: string, dato?: unknown): void {
      for (const manejador of this.manejadores.get(evento) ?? []) {
        manejador(dato);
      }
    }

    async connect(): Promise<void> {
      this.conectado = true;
    }

    async query(texto: string): Promise<{ rows: [] }> {
      if (this.fallarConsulta || control.fallarTodasLasConsultas) {
        throw new Error("conexión muerta");
      }
      this.consultas.push(texto);
      return { rows: [] };
    }

    async end(): Promise<void> {
      this.conectado = false;
      this.terminado = true;
    }
  }

  const instancias: ClienteFalso[] = [];
  return { ClienteFalso, instancias, control };
});

vi.mock("pg", () => ({ Client: ClienteFalso }));

const { BusEventosPostgres } = await import("./BusEventosPostgres");
const { TIPO_RECONEXION } = await import("@/dominio/servicios/IBusEventos");

/** Deja correr las microtareas pendientes (los timers están falseados). */
function tick(): Promise<void> {
  return new Promise((resolver) => setImmediate(resolver));
}

describe("BusEventosPostgres — resiliencia de las conexiones", () => {
  beforeEach(() => {
    instancias.length = 0;
    control.fallarTodasLasConsultas = false;
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    // Solo se falsea setTimeout: setImmediate se usa para vaciar microtareas.
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("publicar reintenta con una conexión nueva si la cacheada está muerta", async () => {
    const bus = new BusEventosPostgres();

    // Primera publicación: crea la conexión y funciona.
    await bus.publicar({ tipo: "mensaje.nuevo", usuarioId: "u1" });
    expect(instancias).toHaveLength(1);
    expect(instancias[0]!.consultas).toHaveLength(1);

    // Postgres se reinicia: la conexión cacheada sigue en memoria pero ya no
    // sirve, y el driver todavía no emitió "error".
    instancias[0]!.fallarConsulta = true;

    await bus.publicar({ tipo: "mensaje.nuevo", usuarioId: "u1" });

    // Se descartó la muerta y se abrió una nueva, sin propagar el error.
    expect(instancias).toHaveLength(2);
    expect(instancias[0]!.terminado).toBe(true);
    expect(instancias[1]!.consultas).toHaveLength(1);
  });

  it("propaga el error si la conexión de reemplazo tampoco funciona", async () => {
    const bus = new BusEventosPostgres();
    await bus.publicar({ tipo: "mensaje.nuevo", usuarioId: "u1" });

    // Base caída de verdad: ni la cacheada ni la nueva responden.
    control.fallarTodasLasConsultas = true;

    await expect(
      bus.publicar({ tipo: "mensaje.nuevo", usuarioId: "u1" }),
    ).rejects.toThrow("conexión muerta");
  });

  it("la escucha se restablece sola tras perder la conexión", async () => {
    const bus = new BusEventosPostgres();
    const control = new AbortController();
    const recibidos: EventoTiempoReal[] = [];

    const consumo = (async () => {
      for await (const evento of bus.suscribir("u1", control.signal)) {
        recibidos.push(evento);
      }
    })();
    await tick();

    // Se abrió la conexión de escucha y quedó a la espera del canal.
    expect(instancias).toHaveLength(1);
    expect(instancias[0]!.consultas[0]).toContain("LISTEN");

    // Llega un evento normal, dirigido a este usuario.
    instancias[0]!.emit("notification", {
      payload: JSON.stringify({ tipo: "mensaje.nuevo", usuarioId: "u1" }),
    });
    await tick();
    expect(recibidos.map((e) => e.tipo)).toEqual(["mensaje.nuevo"]);

    // Cae Postgres. Antes de este arreglo, la promesa de escucha quedaba
    // memoizada y el tiempo real moría acá, en silencio y para siempre.
    instancias[0]!.emit("error", new Error("terminating connection"));
    await vi.advanceTimersByTimeAsync(1_100);
    await tick();

    // Se reconectó sola y volvió a suscribirse al canal.
    expect(instancias).toHaveLength(2);
    expect(instancias[1]!.consultas[0]).toContain("LISTEN");

    // Y avisó del hueco para que el cliente re-sincronice.
    expect(recibidos.map((e) => e.tipo)).toEqual([
      "mensaje.nuevo",
      TIPO_RECONEXION,
    ]);
    expect(recibidos[1]!.usuarioId).toBe("u1");

    // La conexión nueva entrega eventos como la original.
    instancias[1]!.emit("notification", {
      payload: JSON.stringify({ tipo: "alerta.nueva", usuarioId: "u1" }),
    });
    await tick();
    expect(recibidos.map((e) => e.tipo)).toContain("alerta.nueva");

    control.abort();
    await consumo;
  });

  it("sigue filtrando por usuario y no entrega eventos ajenos", async () => {
    const bus = new BusEventosPostgres();
    const control = new AbortController();
    const recibidos: EventoTiempoReal[] = [];

    const consumo = (async () => {
      for await (const evento of bus.suscribir("u1", control.signal)) {
        recibidos.push(evento);
      }
    })();
    await tick();

    instancias[0]!.emit("notification", {
      payload: JSON.stringify({ tipo: "mensaje.nuevo", usuarioId: "otro" }),
    });
    instancias[0]!.emit("notification", {
      payload: JSON.stringify({ tipo: "mensaje.nuevo", usuarioId: "u1" }),
    });
    await tick();

    expect(recibidos).toHaveLength(1);
    expect(recibidos[0]!.usuarioId).toBe("u1");

    control.abort();
    await consumo;
  });
});
