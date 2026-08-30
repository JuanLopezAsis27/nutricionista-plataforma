import type { IMetricaDispositivoRepositorio } from "@/dominio/repositorios/IMetricaDispositivoRepositorio";
import {
  MetricaDispositivo,
  type FuenteMetrica,
} from "@/dominio/entidades/MetricaDispositivo";

/** Una métrica diaria a importar (el pacienteId lo pone el caso de uso). */
export interface DatosImportarMetrica {
  fecha: Date;
  fuente: FuenteMetrica;
  pasos?: number | null;
  minutosActividad?: number | null;
  caloriasActivas?: number | null;
  frecuenciaCardiacaReposo?: number | null;
  horasSueno?: number | null;
}

/**
 * Caso de uso: importar (upsert) las métricas diarias de un wearable para un
 * paciente. Idempotente por día/fuente. Devuelve cuántas se guardaron.
 */
export class ImportarMetricas {
  constructor(private readonly metricas: IMetricaDispositivoRepositorio) {}

  async ejecutar(
    pacienteId: string,
    dias: DatosImportarMetrica[],
  ): Promise<number> {
    for (const dia of dias) {
      const metrica = MetricaDispositivo.crear(
        { pacienteId, ...dia },
        crypto.randomUUID(),
      );
      await this.metricas.guardar(metrica);
    }
    return dias.length;
  }
}
