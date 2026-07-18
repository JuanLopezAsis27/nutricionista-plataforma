import type { PgBoss } from "pg-boss";
import { registrarLimpiarArchivosHuerfanos } from "./manejadores/limpiarArchivosHuerfanos";
import { registrarGenerarAlertasSeguimiento } from "./manejadores/generarAlertasSeguimiento";

/**
 * Registra todas las colas, manejadores y crons del worker.
 * Cada fase suma sus manejadores acá (recordatorios de turnos, etc.).
 */
export async function registrarTrabajos(boss: PgBoss): Promise<void> {
  await registrarLimpiarArchivosHuerfanos(boss);
  await registrarGenerarAlertasSeguimiento(boss);
}
