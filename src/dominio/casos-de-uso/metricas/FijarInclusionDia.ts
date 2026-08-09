import type { IMetricaDispositivoRepositorio } from "../../repositorios/IMetricaDispositivoRepositorio";

/**
 * Caso de uso: el paciente decide si los datos del wearable de un día concreto
 * cuentan para su seguimiento (opt-in por día).
 */
export class FijarInclusionDia {
  constructor(private readonly metricas: IMetricaDispositivoRepositorio) {}

  ejecutar(pacienteId: string, fecha: Date, incluir: boolean): Promise<void> {
    return this.metricas.fijarInclusion(pacienteId, fecha, incluir);
  }
}
