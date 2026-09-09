import type { ConfiguracionRecordatorios } from "../entidades/ConfiguracionRecordatorios";

/**
 * Contrato de persistencia de la configuración de recordatorios (una fila por
 * inquilino). `guardar` hace upsert: la fila se crea recién cuando el
 * profesional toca algo, y hasta entonces rige `porDefecto()`.
 */
export interface IConfiguracionRecordatoriosRepositorio {
  obtener(): Promise<ConfiguracionRecordatorios | null>;
  guardar(
    configuracion: ConfiguracionRecordatorios,
  ): Promise<ConfiguracionRecordatorios>;
}
