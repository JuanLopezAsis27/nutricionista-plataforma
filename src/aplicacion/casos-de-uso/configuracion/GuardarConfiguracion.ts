import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import {
  ConfiguracionConsultorio,
  type DatosConfiguracion,
} from "@/dominio/entidades/ConfiguracionConsultorio";

/**
 * Caso de uso: guardar cambios en la configuración del consultorio. Toma la
 * actual (o la de por defecto si no existe), aplica y valida los cambios en la
 * entidad y hace upsert de la fila única.
 */
export class GuardarConfiguracion {
  constructor(private readonly repo: IConfiguracionRepositorio) {}

  async ejecutar(
    cambios: Partial<DatosConfiguracion>,
  ): Promise<ConfiguracionConsultorio> {
    const actual =
      (await this.repo.obtener()) ?? ConfiguracionConsultorio.porDefecto();
    return this.repo.guardar(actual.actualizar(cambios));
  }
}
