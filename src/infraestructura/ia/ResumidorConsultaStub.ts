import type {
  IResumidorConsulta,
  ResumenGenerado,
  TramoConsulta,
} from "@/dominio/servicios/IResumidorConsulta";

/**
 * Adaptador STUB del resumidor: sin IA configurada no hay resumen.
 *
 * Lanza por el mismo motivo que `TranscriptorStub`: un resumen de demostración
 * guardado junto a la consulta de un paciente se lee como el resumen de esa
 * consulta. Sin clave, la pantalla muestra las transcripciones —que son reales—
 * y dice que falta configurar la IA para resumirlas.
 */
export class ResumidorConsultaStub implements IResumidorConsulta {
  async resumir(
    _tramos: TramoConsulta[],
    _contexto: { nombrePaciente?: string | null; fecha?: Date | null },
  ): Promise<ResumenGenerado> {
    throw new Error(
      "No hay IA configurada para resumir la consulta. Cargá la clave en Integraciones.",
    );
  }
}
