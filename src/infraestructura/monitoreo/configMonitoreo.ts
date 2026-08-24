import type { IMonitorErrores } from "@/dominio/servicios/IMonitorErrores";
import { MonitorErroresConsola } from "./MonitorErroresConsola";
import { MonitorErroresWebhook } from "./MonitorErroresWebhook";
import { MonitorErroresCompuesto } from "./MonitorErroresCompuesto";

/**
 * Arma el monitor de errores según el entorno.
 *
 * Siempre registra por consola (logs del VPS). Si `MONITOR_WEBHOOK_URL` está
 * configurada, además envía un aviso al webhook (Slack/Discord/colector propio).
 *
 * Para enchufar Sentry en el futuro: crear `MonitorErroresSentry` implementando
 * `IMonitorErrores` y sumarlo acá (o reemplazar). No hace falta tocar el resto
 * de la app: todo consume el puerto `IMonitorErrores`.
 */
export function crearMonitorErrores(): IMonitorErrores {
  const destinos: IMonitorErrores[] = [new MonitorErroresConsola()];

  const webhook = process.env.MONITOR_WEBHOOK_URL;
  if (webhook) {
    destinos.push(new MonitorErroresWebhook(webhook));
  }

  return destinos.length === 1 ? destinos[0]! : new MonitorErroresCompuesto(destinos);
}
