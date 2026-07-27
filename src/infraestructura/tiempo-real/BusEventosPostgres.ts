import { EventEmitter, on } from "node:events";
import { Client } from "pg";
import type { IBusEventos, EventoTiempoReal } from "@/dominio/servicios/IBusEventos";

const CANAL = "eventos_app";

/**
 * Implementación del bus de eventos con Postgres LISTEN/NOTIFY.
 *
 * - `publicar` hace `pg_notify(CANAL, json)`: llega a TODOS los procesos que
 *   escuchan el canal (la app y el worker corren separados).
 * - `suscribir` usa una única conexión LISTEN de por vida en el proceso (la
 *   app) y un EventEmitter interno para hacer fan-out a cada subscription SSE,
 *   filtrando por `usuarioId`. Se apoya en `events.on(..., { signal })` para
 *   respetar el cierre de la conexión del cliente.
 *
 * Dos conexiones lazy singleton: una para publicar, otra para escuchar (solo
 * se crea en el proceso que se suscribe). Molde tomado de PgBossColaTrabajos.
 */
export class BusEventosPostgres implements IBusEventos {
  private readonly emisor = new EventEmitter();
  private clientePublicar: Client | null = null;
  private promesaEscucha: Promise<void> | null = null;

  constructor() {
    // Muchas subscriptions concurrentes escuchan el mismo emisor.
    this.emisor.setMaxListeners(0);
  }

  async publicar(evento: EventoTiempoReal): Promise<void> {
    const cliente = await this.obtenerClientePublicar();
    await cliente.query("SELECT pg_notify($1, $2)", [CANAL, JSON.stringify(evento)]);
  }

  async *suscribir(
    usuarioId: string,
    signal: AbortSignal,
  ): AsyncIterable<EventoTiempoReal> {
    await this.asegurarEscucha();
    try {
      for await (const [evento] of on(this.emisor, "evento", { signal })) {
        const ev = evento as EventoTiempoReal;
        if (ev.usuarioId === usuarioId) {
          yield ev;
        }
      }
    } catch (error) {
      // El abort del signal (cliente desconectado) es cierre normal.
      if (signal.aborted) return;
      throw error;
    }
  }

  private async obtenerClientePublicar(): Promise<Client> {
    if (!this.clientePublicar) {
      const cliente = new Client({ connectionString: this.urlBase() });
      cliente.on("error", (e) => console.error("[bus] error de publicación:", e));
      await cliente.connect();
      this.clientePublicar = cliente;
    }
    return this.clientePublicar;
  }

  private asegurarEscucha(): Promise<void> {
    this.promesaEscucha ??= this.iniciarEscucha();
    return this.promesaEscucha;
  }

  private async iniciarEscucha(): Promise<void> {
    const cliente = new Client({ connectionString: this.urlBase() });
    cliente.on("notification", (msg) => {
      if (!msg.payload) return;
      try {
        this.emisor.emit("evento", JSON.parse(msg.payload) as EventoTiempoReal);
      } catch {
        // payload malformado: se ignora
      }
    });
    cliente.on("error", (e) => console.error("[bus] error de escucha:", e));
    await cliente.connect();
    await cliente.query(`LISTEN ${CANAL}`);
  }

  private urlBase(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Falta DATABASE_URL para el bus de eventos.");
    }
    return url;
  }
}
