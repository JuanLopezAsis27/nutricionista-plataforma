import type { ConfiguracionConsultorio } from "../entidades/ConfiguracionConsultorio";

/**
 * Contrato de persistencia de la configuración del consultorio (singleton).
 * `guardar` hace upsert de la fila única (id "default").
 */
export interface IConfiguracionRepositorio {
  obtener(): Promise<ConfiguracionConsultorio | null>;
  guardar(configuracion: ConfiguracionConsultorio): Promise<ConfiguracionConsultorio>;
}
