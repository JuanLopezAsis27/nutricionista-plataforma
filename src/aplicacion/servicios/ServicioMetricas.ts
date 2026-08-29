import type { ImportarMetricas } from "@/dominio/casos-de-uso/metricas/ImportarMetricas";
import type { ObtenerMetricasDelPaciente } from "@/dominio/casos-de-uso/metricas/ObtenerMetricasDelPaciente";
import type { FijarInclusionDia } from "@/dominio/casos-de-uso/metricas/FijarInclusionDia";
import type { MetricaDispositivo } from "@/dominio/entidades/MetricaDispositivo";
import type {
  ImportarMetricasDto,
  MetricaSalidaDto,
} from "../dtos/metricas.dto";

/**
 * Servicio de aplicación de las métricas de dispositivo (wearables). Orquesta
 * la importación, la consulta por rango y el opt-in por día.
 */
export class ServicioMetricas {
  constructor(
    private readonly importarUC: ImportarMetricas,
    private readonly obtenerUC: ObtenerMetricasDelPaciente,
    private readonly fijarInclusionUC: FijarInclusionDia,
  ) {}

  importar(pacienteId: string, datos: ImportarMetricasDto): Promise<number> {
    return this.importarUC.ejecutar(pacienteId, datos.dias);
  }

  async listar(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<MetricaSalidaDto[]> {
    const metricas = await this.obtenerUC.ejecutar(pacienteId, desde, hasta);
    return metricas.map(ServicioMetricas.aSalida);
  }

  fijarInclusion(
    pacienteId: string,
    fecha: Date,
    incluir: boolean,
  ): Promise<void> {
    return this.fijarInclusionUC.ejecutar(pacienteId, fecha, incluir);
  }

  private static aSalida(metrica: MetricaDispositivo): MetricaSalidaDto {
    const m = metrica.aPrimitivos();
    return {
      fecha: m.fecha,
      fuente: m.fuente,
      pasos: m.pasos,
      minutosActividad: m.minutosActividad,
      caloriasActivas: m.caloriasActivas,
      frecuenciaCardiacaReposo: m.frecuenciaCardiacaReposo,
      horasSueno: m.horasSueno,
      incluir: m.incluir,
    };
  }
}
