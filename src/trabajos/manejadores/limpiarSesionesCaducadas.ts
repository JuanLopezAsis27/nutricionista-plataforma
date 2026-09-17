import type { PgBoss } from "pg-boss";
import { servicioAutenticacion } from "@/infraestructura/contenedor/contenedor";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import { ZONA_HORARIA } from "../zonaHoraria";

export const COLA_LIMPIAR_SESIONES = "limpiar-sesiones-caducadas";

/**
 * Limpieza diaria de `tokens_refresco`: borra los vencidos o revocados hace
 * más que la validez de la sesión (ver `LimpiarSesionesCaducadas`). Sin esto
 * la tabla sumaba una fila por cada renovación de sesión y no se achicaba nunca.
 */
export async function registrarLimpiarSesionesCaducadas(
  boss: PgBoss,
): Promise<void> {
  await boss.createQueue(COLA_LIMPIAR_SESIONES);

  await boss.work(COLA_LIMPIAR_SESIONES, async () => {
    // Los tokens no son de inquilino: los usuarios son globales, igual que en
    // el login y la renovación de sesión.
    const borrados = await ejecutarGlobal(() =>
      servicioAutenticacion().limpiarSesionesCaducadas(),
    );
    console.log(
      `[worker] limpieza de sesiones: ${borrados} token(s) de refresco borrados.`,
    );
  });

  // Todos los días 04:30 (hora local del proceso; ver TZ en .env), fuera del
  // horario del consultorio y lejos del respaldo de las 03:00.
  await boss.schedule(COLA_LIMPIAR_SESIONES, "30 4 * * *", undefined, {
    tz: ZONA_HORARIA,
  });
}
