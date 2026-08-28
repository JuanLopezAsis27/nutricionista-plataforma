import type { PgBoss } from "pg-boss";
import { registrarLimpiarArchivosHuerfanos } from "./manejadores/limpiarArchivosHuerfanos";
import { registrarGenerarAlertasSeguimiento } from "./manejadores/generarAlertasSeguimiento";
import { registrarEnviarRecordatoriosTurnos } from "./manejadores/enviarRecordatoriosTurnos";

/**
 * Registra todas las colas, manejadores y crons del worker.
 * Cada fase suma sus manejadores acá.
 *
 * Los barridos que dependen del inquilino (recordatorios, alertas) se arman
 * con `registrarTrabajoPorInquilino`: el cron despacha un trabajo por
 * consultorio, cada uno con sus propios reintentos y su cola de fallidos.
 * La limpieza del bucket es transversal y sigue siendo un trabajo único.
 */
export async function registrarTrabajos(boss: PgBoss): Promise<void> {
  await registrarLimpiarArchivosHuerfanos(boss);
  await registrarGenerarAlertasSeguimiento(boss);
  await registrarEnviarRecordatoriosTurnos(boss);
}
