/**
 * Sonda de salud del proceso worker.
 *
 * El worker no sirve HTTP, así que no puede usar /api/salud. Lo que importa de
 * él es lo mismo que de la app: que llegue a Postgres, porque ahí viven la cola
 * (pg-boss) y los datos. Un worker vivo pero sin base no procesa un solo
 * trabajo y, sin healthcheck, Docker lo daba por sano.
 *
 * Sale con 0 si la base responde, 1 si no. Lo invoca el `healthcheck` del
 * compose de producción.
 */
import { Client } from "pg";

const TIEMPO_LIMITE_MS = 5_000;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[salud-worker] falta DATABASE_URL.");
  process.exit(1);
}

const cliente = new Client({
  connectionString: url,
  connectionTimeoutMillis: TIEMPO_LIMITE_MS,
});

// Red de seguridad: si la conexión queda colgada sin resolver ni fallar, el
// healthcheck no debe esperar para siempre al timeout de Docker.
const cortar = setTimeout(() => {
  console.error("[salud-worker] la base no respondió a tiempo.");
  process.exit(1);
}, TIEMPO_LIMITE_MS);
cortar.unref();

try {
  await cliente.connect();
  await cliente.query("SELECT 1");
  await cliente.end();
  process.exit(0);
} catch (error) {
  console.error("[salud-worker] la base de datos no responde:", error.message);
  process.exit(1);
}
