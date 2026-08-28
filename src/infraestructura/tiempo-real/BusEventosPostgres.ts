import { EventEmitter, on } from "node:events";
import { Client } from "pg";
import {
  TIPO_RECONEXION,
  type IBusEventos,
  type EventoTiempoReal,
} from "@/dominio/servicios/IBusEventos";

const CANAL = "eventos_app";

/** Espera inicial y tope del backoff exponencial de reconexión. */
const ESPERA_BASE_MS = 1_000;
const ESPERA_TOPE_MS = 30_000;

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
 * se crea en el proceso que se suscribe).
 *
 * RECONEXIÓN: las dos conexiones son de larga vida y Postgres se reinicia
 * (una migración, un `docker compose up -d`, un corte de red). Antes, el
 * handler de error solo logueaba y la promesa de escucha quedaba memoizada
 * para siempre: el tiempo real moría en silencio hasta reiniciar el proceso,
 * sin que la UI mostrara nada. Ahora:
 *   - la conexión de publicación se descarta al fallar y se rehace en el
 *     próximo `publicar` (con un reintento inmediato, porque la conexión pudo
 *     morir entre que se tomó del cache y se usó);
 *   - la conexión de escucha se reintenta sola con backoff exponencial, y al
 *     volver emite TIPO_RECONEXION a las subscriptions vivas.
 */
export class BusEventosPostgres implements IBusEventos {
  private readonly emisor = new EventEmitter();
  private clientePublicar: Client | null = null;
  private promesaEscucha: Promise<void> | null = null;
  private reconexionProgramada: ReturnType<typeof setTimeout> | null = null;
  private intentosReconexion = 0;

  constructor() {
    // Muchas subscriptions concurrentes escuchan el mismo emisor.
    this.emisor.setMaxListeners(0);
  }

  async publicar(evento: EventoTiempoReal): Promise<void> {
    const carga = JSON.stringify(evento);
    const cliente = await this.obtenerClientePublicar();
    try {
      await this.notificar(cliente, carga);
    } catch (error) {
      // La conexión cacheada pudo haberse cerrado sin que llegara todavía el
      // evento "error"/"end". Se descarta y se reintenta UNA vez con una
      // conexión nueva; si esta también falla, el error sube al llamador.
      console.error(
        "[bus] fallo al publicar, reintentando con conexión nueva:",
        error,
      );
      this.descartarClientePublicar(cliente);
      const reemplazo = await this.obtenerClientePublicar();
      await this.notificar(reemplazo, carga);
    }
  }

  async *suscribir(
    usuarioId: string,
    signal: AbortSignal,
  ): AsyncIterable<EventoTiempoReal> {
    await this.asegurarEscucha();
    try {
      for await (const [evento] of on(this.emisor, "evento", { signal })) {
        const ev = evento as EventoTiempoReal;
        // El aviso de reconexión es interno del proceso y no trae destinatario:
        // se entrega a TODAS las subscriptions vivas, con su propio usuarioId.
        if (ev.tipo === TIPO_RECONEXION) {
          yield { tipo: TIPO_RECONEXION, usuarioId };
          continue;
        }
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

  private notificar(cliente: Client, carga: string): Promise<unknown> {
    return cliente.query("SELECT pg_notify($1, $2)", [CANAL, carga]);
  }

  // --- Conexión de publicación ---------------------------------------------

  private async obtenerClientePublicar(): Promise<Client> {
    if (!this.clientePublicar) {
      const cliente = new Client({ connectionString: this.urlBase() });
      cliente.on("error", (e) => {
        console.error("[bus] error de publicación:", e);
        this.descartarClientePublicar(cliente);
      });
      cliente.on("end", () => this.descartarClientePublicar(cliente));
      await cliente.connect();
      // Se cachea recién acá: si connect() falla, el próximo intento rehace la
      // conexión en vez de reusar una instancia muerta.
      this.clientePublicar = cliente;
    }
    return this.clientePublicar;
  }

  /**
   * Suelta la conexión de publicación cacheada.
   *
   * Solo si sigue siendo la misma instancia: un evento "error" tardío de una
   * conexión ya reemplazada no debe descartar la nueva.
   */
  private descartarClientePublicar(cliente: Client): void {
    if (this.clientePublicar === cliente) {
      this.clientePublicar = null;
    }
    void cliente.end().catch(() => {
      // Ya estaba cerrada; no hay nada que hacer.
    });
  }

  // --- Conexión de escucha --------------------------------------------------

  private asegurarEscucha(): Promise<void> {
    this.promesaEscucha ??= this.iniciarEscucha().catch((error: unknown) => {
      // No memoizar un fallo: si se guardara la promesa rechazada, todas las
      // suscripciones posteriores fallarían para siempre.
      this.promesaEscucha = null;
      throw error;
    });
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
    cliente.on("error", (e) => {
      console.error("[bus] error de escucha:", e);
      this.programarReconexion();
    });
    cliente.on("end", () => this.programarReconexion());
    await cliente.connect();
    await cliente.query(`LISTEN ${CANAL}`);
    this.intentosReconexion = 0;
  }

  /**
   * Programa un intento de reconexión de la escucha con backoff exponencial.
   *
   * Es la pieza que faltaba: las subscriptions ya abiertas esperan de forma
   * pasiva sobre el EventEmitter, así que nadie volvería a llamar a
   * `asegurarEscucha()` por su cuenta. El bus tiene que reconectarse solo.
   */
  private programarReconexion(): void {
    if (this.reconexionProgramada) return;

    this.promesaEscucha = null;
    const espera = Math.min(
      ESPERA_BASE_MS * 2 ** this.intentosReconexion,
      ESPERA_TOPE_MS,
    );
    this.intentosReconexion += 1;

    const temporizador = setTimeout(() => {
      this.reconexionProgramada = null;
      void this.asegurarEscucha().then(
        () => {
          console.log("[bus] escucha restablecida.");
          // Hubo un hueco: los NOTIFY emitidos mientras estuvo caída se
          // perdieron. Se avisa para que el cliente re-sincronice.
          this.emisor.emit("evento", { tipo: TIPO_RECONEXION, usuarioId: "" });
        },
        (error: unknown) => {
          console.error("[bus] reconexión fallida, se reintenta:", error);
          this.programarReconexion();
        },
      );
    }, espera);

    // No mantener vivo el proceso solo por el temporizador de reconexión.
    temporizador.unref?.();
    this.reconexionProgramada = temporizador;
  }

  private urlBase(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Falta DATABASE_URL para el bus de eventos.");
    }
    return url;
  }
}
