import type { IMonitorErrores, ContextoError } from "@/dominio/servicios/IMonitorErrores";

/**
 * Compone varios monitores en uno: reenvía cada captura a todos los destinos
 * (ej. consola + webhook). Aísla fallos: si un destino lanza, no afecta a los
 * demás ni al flujo que invoca.
 */
export class MonitorErroresCompuesto implements IMonitorErrores {
  constructor(private readonly destinos: IMonitorErrores[]) {}

  capturar(error: unknown, contexto?: ContextoError): void {
    for (const destino of this.destinos) {
      try {
        destino.capturar(error, contexto);
      } catch {
        // Un destino roto no debe frenar a los otros.
      }
    }
  }
}
