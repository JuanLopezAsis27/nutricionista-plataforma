import type { IMonitorErrores, ContextoError } from "@/dominio/servicios/IMonitorErrores";
import { describirError } from "./MonitorErroresConsola";

/**
 * Monitor por webhook: hace POST del error a una URL configurada
 * (`MONITOR_WEBHOOK_URL`). Sirve para recibir avisos en Slack/Discord o en un
 * colector propio, sin depender de un proveedor específico.
 *
 * Es best-effort: si el POST falla, se ignora (nunca rompe el flujo). El texto
 * es compacto para encajar con webhooks de chat (campo `text`/`content`) y a la
 * vez lleva el detalle estructurado.
 */
export class MonitorErroresWebhook implements IMonitorErrores {
  constructor(
    private readonly url: string,
    private readonly entorno = process.env.NODE_ENV ?? "development",
  ) {}

  capturar(error: unknown, contexto?: ContextoError): void {
    const { nombre, mensaje, stack } = describirError(error);
    const resumen =
      `🐛 *${nombre}*: ${mensaje}` +
      (contexto?.origen ? ` · ${contexto.origen}` : "") +
      (contexto?.ruta ? ` · ${contexto.ruta}` : "") +
      ` · [${this.entorno}]`;

    const cuerpo = {
      // Compatibilidad con webhooks de chat comunes.
      text: resumen,
      content: resumen,
      detalle: {
        nombre,
        mensaje,
        origen: contexto?.origen,
        ruta: contexto?.ruta,
        usuarioId: contexto?.usuarioId,
        extra: contexto?.extra,
        stack: stack?.split("\n").slice(0, 8).join("\n"),
        ts: new Date().toISOString(),
      },
    };

    // Fire-and-forget: no se espera ni se propaga el resultado.
    void fetch(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    }).catch(() => {
      // Silencioso a propósito: el monitoreo no puede tumbar la request.
    });
  }
}
