import type { MetricaDispositivo } from "../entidades/MetricaDispositivo";

/**
 * Contrato de persistencia de las métricas de dispositivo (wearables).
 * `guardar` es idempotente por (paciente, fecha, fuente): reimportar el mismo
 * día actualiza el registro en vez de duplicarlo.
 */
export interface IMetricaDispositivoRepositorio {
  guardar(metrica: MetricaDispositivo): Promise<void>;
  /** Métricas del rango [desde, hasta], orden ascendente por fecha. */
  listarPorRango(pacienteId: string, desde: Date, hasta: Date): Promise<MetricaDispositivo[]>;
  /** Fija el opt-in de TODAS las fuentes de un día del paciente. */
  fijarInclusion(pacienteId: string, fecha: Date, incluir: boolean): Promise<void>;
}
