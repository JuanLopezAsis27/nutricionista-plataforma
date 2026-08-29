import type { PgBoss } from "pg-boss";
import type { ResultadoMedio } from "@/dominio/casos-de-uso/recordatorios/EnviarRecordatoriosProgramados";
import { servicioRecordatorios } from "@/infraestructura/contenedor/contenedor";
import { registrarTrabajoPorInquilino, colaDeInquilino } from "../porInquilino";

export const COLA_RECORDATORIOS = "recordatorios-turnos";
export const COLA_RECORDATORIOS_INQUILINO = colaDeInquilino(COLA_RECORDATORIOS);

/**
 * Barrido de recordatorios de turno: WhatsApp Y email, según la programación
 * de cada consultorio ("uno 3 días antes y otro 1 día antes").
 *
 * Es UN solo trabajo para los dos medios. Antes eran dos —el email con su cron
 * diario a las 09:00 y WhatsApp con el suyo—, y tener dos caminos para mandar
 * el mismo aviso significaba dos lugares donde apagarlo, dos horarios que
 * mantener sincronizados y ningún lugar donde ver qué salió.
 *
 * Corre CADA HORA, no una vez al día, y cada consultorio se apaga solo cuando
 * no es su hora. Es más simple que registrar un cron distinto por inquilino
 * —que además habría que rearmar cada vez que alguien cambia el horario— y es
 * más robusto: si el worker estuvo caído a las 09:00, la corrida de las 10:00
 * no manda nada de todos modos, pero un despliegue a las 08:58 no se pierde la
 * ventana por dos minutos.
 *
 * Es idempotente en los dos medios —WhatsApp por el índice único
 * (turno, diasAntes), el email por la unicidad de `emails_enviados`—, así que
 * pg-boss puede reintentar un inquilino fallido sin que el paciente reciba dos
 * veces el mismo aviso.
 */
export async function registrarEnviarRecordatorios(
  boss: PgBoss,
): Promise<void> {
  await registrarTrabajoPorInquilino(boss, {
    nombre: COLA_RECORDATORIOS,
    // Cada hora, a los 5 minutos (hora local del proceso; ver TZ en .env).
    cron: "5 * * * *",
    ejecutar: () => servicioRecordatorios().enviarProgramados(),
    describir: (r) =>
      r.corrio
        ? `WhatsApp: ${resumirMedio(r.whatsapp)} · Email: ${resumirMedio(r.email)}`
        : `sin envío: ${r.motivo}`,
  });
}

function resumirMedio(medio: ResultadoMedio): string {
  if (!medio.corrio) return medio.motivo ?? "no corrió";
  return `${medio.enviados} enviado(s), ${medio.omitidos} omitido(s), ${medio.fallidos} fallido(s)`;
}
