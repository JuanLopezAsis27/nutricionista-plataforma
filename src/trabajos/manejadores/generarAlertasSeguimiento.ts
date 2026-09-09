import type { PgBoss } from "pg-boss";
import { servicioSeguimiento } from "@/infraestructura/contenedor/contenedor";
import { registrarTrabajoPorInquilino, colaDeInquilino } from "../porInquilino";

export const COLA_ALERTAS_SEGUIMIENTO = "generar-alertas-seguimiento";
export const COLA_ALERTAS_SEGUIMIENTO_INQUILINO = colaDeInquilino(
  COLA_ALERTAS_SEGUIMIENTO,
);

/**
 * Barrido diario de seguimiento: pacientes sin registrar peso/actividad,
 * planes vencidos y turnos de mañana sin confirmar. Idempotente: correrlo
 * de nuevo no duplica alertas pendientes.
 *
 * Corre una vez POR CADA nutricionista (inquilino) como un trabajo
 * independiente, acotando el alcance para no cruzar datos entre consultorios
 * y para que el fallo de uno no interrumpa el barrido de los otros
 * (ver ../porInquilino).
 */
export async function registrarGenerarAlertasSeguimiento(
  boss: PgBoss,
): Promise<void> {
  await registrarTrabajoPorInquilino(boss, {
    nombre: COLA_ALERTAS_SEGUIMIENTO,
    // Todos los días 07:00 (hora local del proceso; ver TZ en .env).
    cron: "0 7 * * *",
    ejecutar: () => servicioSeguimiento().generarAlertas(),
    describir: (r) => `${r.generadas} alerta(s) nueva(s).`,
  });
}
