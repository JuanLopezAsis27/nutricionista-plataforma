import { PgBoss } from "pg-boss";
import type { IColaTrabajos } from "@/dominio/servicios/IColaTrabajos";

/**
 * Implementación con pg-boss del puerto de cola de trabajos.
 *
 * Este adaptador solo ENCOLA (lo usan los casos de uso desde la app Next);
 * el consumo ocurre en el proceso worker (src/trabajos/worker.ts). Por eso
 * se inicia sin supervisión ni scheduler: es un emisor liviano.
 */
export class PgBossColaTrabajos implements IColaTrabajos {
  private boss: PgBoss | null = null;

  async encolar<T extends object>(
    nombre: string,
    datos: T,
    opciones?: { ejecutarEn?: Date },
  ): Promise<void> {
    const boss = await this.obtenerBoss();
    // createQueue es idempotente; garantiza que la cola exista antes del send.
    await boss.createQueue(nombre);
    await boss.send(nombre, datos, {
      startAfter: opciones?.ejecutarEn,
    });
  }

  private async obtenerBoss(): Promise<PgBoss> {
    if (!this.boss) {
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error("Falta DATABASE_URL para la cola de trabajos.");
      }
      this.boss = new PgBoss({
        connectionString: url,
        supervise: false,
        schedule: false,
      });
      this.boss.on("error", (error) => {
        console.error("[cola] error de pg-boss:", error);
      });
      await this.boss.start();
    }
    return this.boss;
  }
}
