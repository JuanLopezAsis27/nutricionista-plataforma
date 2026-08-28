import type { PgBoss } from "pg-boss";
import { servicioSecretaria } from "@/infraestructura/contenedor/contenedor";
import { registrarTrabajoPorInquilino, colaDeInquilino } from "../porInquilino";

export const COLA_RECORDATORIOS_TURNOS = "recordatorios-turnos";
export const COLA_RECORDATORIOS_TURNOS_INQUILINO = colaDeInquilino(
  COLA_RECORDATORIOS_TURNOS,
);

/**
 * Barrido diario de recordatorios: envía por email el recordatorio de los
 * turnos de mañana (PENDIENTE/CONFIRMADO). Idempotente: correrlo de nuevo no
 * reenvía los que ya se avisaron. Verificable en Mailpit (:8025) en dev.
 *
 * Corre una vez POR CADA nutricionista (inquilino), con su plantilla y su
 * firma, como un trabajo independiente: el envío lento o fallido de un
 * consultorio ya no retrasa ni cancela el de los demás (ver ../porInquilino).
 */
export async function registrarEnviarRecordatoriosTurnos(
  boss: PgBoss,
): Promise<void> {
  await registrarTrabajoPorInquilino(boss, {
    nombre: COLA_RECORDATORIOS_TURNOS,
    // Todos los días 09:00 (hora local del proceso; ver TZ en .env).
    cron: "0 9 * * *",
    ejecutar: () => servicioSecretaria().enviarRecordatorios(),
    describir: (r) =>
      `${r.enviados} enviado(s), ${r.omitidos} ya avisado(s), ${r.fallidos} fallido(s).`,
  });
}
