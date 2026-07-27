import type { PgBoss } from "pg-boss";
import { registrarLimpiarArchivosHuerfanos } from "./manejadores/limpiarArchivosHuerfanos";
import { registrarGenerarAlertasSeguimiento } from "./manejadores/generarAlertasSeguimiento";
import { registrarEnviarRecordatoriosTurnos } from "./manejadores/enviarRecordatoriosTurnos";

/**
 * Registra todas las colas, manejadores y crons del worker.
 * Cada fase suma sus manejadores acá.
 */
export async function registrarTrabajos(boss: PgBoss): Promise<void> {
  await registrarLimpiarArchivosHuerfanos(boss);
  await registrarGenerarAlertasSeguimiento(boss);
  await registrarEnviarRecordatoriosTurnos(boss);
}
