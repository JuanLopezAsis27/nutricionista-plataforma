/**
 * Proceso worker de trabajos en segundo plano (pg-boss sobre PostgreSQL).
 *
 * Es un adaptador de entrada más (como los routers tRPC): cada manejador
 * ejecuta servicios de aplicación obtenidos del contenedor de DI. No corre
 * dentro de Next: se lanza como proceso propio.
 *
 *   Desarrollo:  npm run worker
 *   Producción:  npm run worker:prod (contenedor propio, misma imagen)
 *
 * IMPORTANTE: definir TZ (ej. America/Argentina/Buenos_Aires) para que los
 * crons disparen en hora local del profesional.
 */
import { PgBoss } from "pg-boss";
import { registrarTrabajos } from "./registrarTrabajos";

async function principal(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL (¿existe el archivo .env?).");
  }

  const boss = new PgBoss(url);
  boss.on("error", (error) => {
    console.error("[worker] error de pg-boss:", error);
  });

  await boss.start();
  await registrarTrabajos(boss);
  console.log("[worker] iniciado; esperando trabajos.");

  const detener = async (senal: string): Promise<void> => {
    console.log(`[worker] ${senal} recibida, deteniendo…`);
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGINT", () => void detener("SIGINT"));
  process.on("SIGTERM", () => void detener("SIGTERM"));
}

principal().catch((error) => {
  console.error("[worker] error fatal al iniciar:", error);
  process.exit(1);
});
