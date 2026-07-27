import type { PgBoss } from "pg-boss";
import {
  servicioSeguimiento,
  repositorioUsuarioCompartido,
} from "@/infraestructura/contenedor/contenedor";
import {
  ejecutarGlobal,
  ejecutarEnNutricionista,
} from "@/infraestructura/multitenancy/contextoTenant";

export const COLA_ALERTAS_SEGUIMIENTO = "generar-alertas-seguimiento";

/**
 * Barrido diario de seguimiento: pacientes sin registrar peso/actividad,
 * planes vencidos y turnos de mañana sin confirmar. Idempotente: correrlo
 * de nuevo no duplica alertas pendientes. Corre POR CADA nutricionista
 * (inquilino), acotando el alcance para no cruzar datos entre consultorios.
 */
export async function registrarGenerarAlertasSeguimiento(boss: PgBoss): Promise<void> {
  await boss.createQueue(COLA_ALERTAS_SEGUIMIENTO);

  await boss.work(COLA_ALERTAS_SEGUIMIENTO, async () => {
    const nutris = (
      await ejecutarGlobal(() => repositorioUsuarioCompartido.listarPorRol("NUTRICIONISTA"))
    ).filter((u) => u.activo);
    let total = 0;
    for (const nutri of nutris) {
      const resultado = await ejecutarEnNutricionista(nutri.id, () =>
        servicioSeguimiento.generarAlertas(),
      );
      total += resultado.generadas;
    }
    console.log(
      `[worker] alertas de seguimiento: ${total} alerta(s) nueva(s) en ${nutris.length} inquilino(s).`,
    );
  });

  // Todos los días 07:00 (hora local del proceso; ver TZ en .env).
  await boss.schedule(COLA_ALERTAS_SEGUIMIENTO, "0 7 * * *");
}
