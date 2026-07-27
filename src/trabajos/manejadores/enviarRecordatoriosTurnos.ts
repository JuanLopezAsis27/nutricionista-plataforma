import type { PgBoss } from "pg-boss";
import {
  servicioSecretaria,
  repositorioUsuarioCompartido,
} from "@/infraestructura/contenedor/contenedor";
import {
  ejecutarGlobal,
  ejecutarEnNutricionista,
} from "@/infraestructura/multitenancy/contextoTenant";

export const COLA_RECORDATORIOS_TURNOS = "recordatorios-turnos";

/**
 * Barrido diario de recordatorios: envía por email el recordatorio de los
 * turnos de mañana (PENDIENTE/CONFIRMADO). Idempotente: correrlo de nuevo no
 * reenvía los que ya se avisaron. Verificable en Mailpit (:8025) en dev.
 * Corre POR CADA nutricionista (inquilino), con su plantilla y su firma.
 */
export async function registrarEnviarRecordatoriosTurnos(boss: PgBoss): Promise<void> {
  await boss.createQueue(COLA_RECORDATORIOS_TURNOS);

  await boss.work(COLA_RECORDATORIOS_TURNOS, async () => {
    const nutris = (
      await ejecutarGlobal(() => repositorioUsuarioCompartido.listarPorRol("NUTRICIONISTA"))
    ).filter((u) => u.activo);
    let enviados = 0;
    let omitidos = 0;
    let fallidos = 0;
    for (const nutri of nutris) {
      const r = await ejecutarEnNutricionista(nutri.id, () =>
        servicioSecretaria.enviarRecordatorios(),
      );
      enviados += r.enviados;
      omitidos += r.omitidos;
      fallidos += r.fallidos;
    }
    console.log(
      `[worker] recordatorios de turnos: ${enviados} enviado(s), ` +
        `${omitidos} ya avisado(s), ${fallidos} fallido(s) en ${nutris.length} inquilino(s).`,
    );
  });

  // Todos los días 09:00 (hora local del proceso; ver TZ en .env).
  await boss.schedule(COLA_RECORDATORIOS_TURNOS, "0 9 * * *");
}
