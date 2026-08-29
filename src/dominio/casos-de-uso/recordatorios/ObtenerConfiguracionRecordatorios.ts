import type { IConfiguracionRecordatoriosRepositorio } from "../../repositorios/IConfiguracionRecordatoriosRepositorio";
import { ConfiguracionRecordatorios } from "../../entidades/ConfiguracionRecordatorios";

/**
 * Caso de uso: la configuración de recordatorios del consultorio.
 *
 * Devuelve los valores por defecto mientras el profesional no haya guardado
 * nada, en vez de null: la fila se crea al primer cambio y hasta entonces el
 * sistema ya tiene una política vigente que la UI tiene que poder mostrar.
 */
export class ObtenerConfiguracionRecordatorios {
  constructor(
    private readonly repositorio: IConfiguracionRecordatoriosRepositorio,
  ) {}

  async ejecutar(): Promise<ConfiguracionRecordatorios> {
    return (
      (await this.repositorio.obtener()) ??
      ConfiguracionRecordatorios.porDefecto()
    );
  }
}
