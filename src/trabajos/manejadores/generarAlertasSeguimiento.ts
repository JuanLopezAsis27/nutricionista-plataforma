import type { PgBoss } from "pg-boss";
import { servicioSeguimiento } from "@/infraestructura/contenedor/contenedor";

export const COLA_ALERTAS_SEGUIMIENTO = "generar-alertas-seguimiento";

/**
 * Barrido diario de seguimiento: pacientes sin registrar peso/actividad,
 * planes vencidos y turnos de mañana sin confirmar. Idempotente: correrlo
 * de nuevo no duplica alertas pendientes.
 */
export async function registrarGenerarAlertasSeguimiento(boss: PgBoss): Promise<void> {
  await boss.createQueue(COLA_ALERTAS_SEGUIMIENTO);

  await boss.work(COLA_ALERTAS_SEGUIMIENTO, async () => {
    const resultado = await servicioSeguimiento.generarAlertas();
    console.log(
      `[worker] alertas de seguimiento: ${resultado.generadas} alerta(s) nueva(s).`,
    );
  });

  // Todos los días 07:00 (hora local del proceso; ver TZ en .env).
  await boss.schedule(COLA_ALERTAS_SEGUIMIENTO, "0 7 * * *");
}
