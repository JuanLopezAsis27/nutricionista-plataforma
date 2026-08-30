import type { IMetricaDispositivoRepositorio } from "@/dominio/repositorios/IMetricaDispositivoRepositorio";
import type { MetricaDispositivo } from "@/dominio/entidades/MetricaDispositivo";

/** Caso de uso: métricas de dispositivo de un paciente en un rango. */
export class ObtenerMetricasDelPaciente {
  constructor(private readonly metricas: IMetricaDispositivoRepositorio) {}

  ejecutar(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<MetricaDispositivo[]> {
    return this.metricas.listarPorRango(pacienteId, desde, hasta);
  }
}
