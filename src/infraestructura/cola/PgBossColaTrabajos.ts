import { PgBoss } from "pg-boss";
import type { IColaTrabajos } from "@/dominio/servicios/IColaTrabajos";

/**
 * Implementación con pg-boss del puerto de cola de trabajos.
 *
 * Este adaptador solo ENCOLA (lo usan los casos de uso desde la app Next);
 * el consumo ocurre en el proceso worker (src/trabajos/worker.ts). Por eso
 * se inicia sin supervisión ni scheduler: es un emisor liviano.
 *
 * RECONEXIÓN: la instancia es de larga vida y su pool puede quedar muerto si
 * Postgres se reinicia. Antes, la instancia cacheada se conservaba pase lo que
 * pase y el handler de error solo logueaba: todo encolado posterior fallaba
 * hasta reiniciar el proceso. Ahora, si un `send` falla, se descarta la
 * instancia y se reintenta una vez con una nueva.
 */
export class PgBossColaTrabajos implements IColaTrabajos {
  private promesaBoss: Promise<PgBoss> | null = null;
  private bossActual: PgBoss | null = null;

  async encolar<T extends object>(
    nombre: string,
    datos: T,
    opciones?: { ejecutarEn?: Date },
  ): Promise<void> {
    const boss = await this.obtenerBoss();
    try {
      await this.enviar(boss, nombre, datos, opciones);
    } catch (error) {
      // El pool pudo morir sin que pg-boss lo hubiera notificado todavía. Se
      // descarta la instancia y se reintenta UNA vez; si vuelve a fallar, el
      // error sube al llamador (el caso de uso decide qué hacer).
      console.error(
        `[cola] fallo al encolar "${nombre}", reintentando:`,
        error,
      );
      this.descartar(boss);
      const reemplazo = await this.obtenerBoss();
      await this.enviar(reemplazo, nombre, datos, opciones);
    }
  }

  private async enviar<T extends object>(
    boss: PgBoss,
    nombre: string,
    datos: T,
    opciones?: { ejecutarEn?: Date },
  ): Promise<void> {
    // createQueue es idempotente; garantiza que la cola exista antes del send.
    await boss.createQueue(nombre);
    await boss.send(nombre, datos, {
      startAfter: opciones?.ejecutarEn,
    });
  }

  /**
   * Instancia compartida, creada de forma perezosa.
   *
   * Se memoiza la PROMESA, no la instancia: dos encolados concurrentes durante
   * el arranque comparten el mismo `start()` en vez de abrir dos pools.
   */
  private obtenerBoss(): Promise<PgBoss> {
    this.promesaBoss ??= this.iniciarBoss().catch((error: unknown) => {
      // No memoizar un fallo de arranque: el próximo encolado vuelve a probar.
      this.promesaBoss = null;
      throw error;
    });
    return this.promesaBoss;
  }

  private async iniciarBoss(): Promise<PgBoss> {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("Falta DATABASE_URL para la cola de trabajos.");
    }

    const boss = new PgBoss({
      connectionString: url,
      supervise: false,
      schedule: false,
    });
    boss.on("error", (error) => {
      // Los errores internos de pg-boss suelen ser transitorios y los maneja
      // solo; no se descarta la instancia acá para no reconstruirla en cada
      // hipo. La red de seguridad real es el reintento de `encolar`.
      console.error("[cola] error de pg-boss:", error);
    });
    boss.on("stopped", () => this.descartar(boss));

    await boss.start();
    this.bossActual = boss;
    return boss;
  }

  /**
   * Suelta la instancia cacheada.
   *
   * Solo si sigue siendo la misma: un evento tardío de una instancia ya
   * reemplazada no debe descartar la nueva.
   */
  private descartar(boss: PgBoss): void {
    if (this.bossActual === boss) {
      this.bossActual = null;
      this.promesaBoss = null;
    }
    void boss.stop({ graceful: false }).catch(() => {
      // Ya estaba detenida; no hay nada que hacer.
    });
  }
}
