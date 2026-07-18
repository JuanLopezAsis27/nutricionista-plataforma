import type { PgBoss } from "pg-boss";
import { servicioArchivo } from "@/infraestructura/contenedor/contenedor";

export const COLA_LIMPIAR_ARCHIVOS = "limpiar-archivos-huerfanos";

/**
 * Limpieza semanal del bucket: elimina objetos sin fila de metadatos
 * (huérfanos que dejan las compensaciones fallidas).
 */
export async function registrarLimpiarArchivosHuerfanos(boss: PgBoss): Promise<void> {
  await boss.createQueue(COLA_LIMPIAR_ARCHIVOS);

  await boss.work(COLA_LIMPIAR_ARCHIVOS, async () => {
    const resultado = await servicioArchivo.limpiarHuerfanos();
    console.log(
      `[worker] limpieza de huérfanos: ${resultado.objetosEliminados} objeto(s) eliminados.`,
    );
  });

  // Domingos 04:00 (hora local del proceso; ver TZ en .env).
  await boss.schedule(COLA_LIMPIAR_ARCHIVOS, "0 4 * * 0");
}
