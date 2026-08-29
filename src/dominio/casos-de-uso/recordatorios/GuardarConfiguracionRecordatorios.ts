import type { IConfiguracionRecordatoriosRepositorio } from "../../repositorios/IConfiguracionRecordatoriosRepositorio";
import type { DatosConfiguracionRecordatorios } from "../../entidades/ConfiguracionRecordatorios";
import { ConfiguracionRecordatorios } from "../../entidades/ConfiguracionRecordatorios";

/**
 * Caso de uso: guardar qué medios de recordatorio están activos y cuándo salen.
 *
 * Aplica los cambios sobre la configuración vigente (o sobre la de fábrica, si
 * todavía no había fila) para que la entidad valide el resultado COMPLETO y no
 * solo lo que vino en el pedido: los invariantes son del conjunto —cuántos
 * avisos, con qué anticipación, a qué hora— y validar campo por campo los deja
 * pasar de a uno.
 */
export class GuardarConfiguracionRecordatorios {
  constructor(
    private readonly repositorio: IConfiguracionRecordatoriosRepositorio,
  ) {}

  async ejecutar(
    cambios: Partial<DatosConfiguracionRecordatorios>,
  ): Promise<ConfiguracionRecordatorios> {
    const actual =
      (await this.repositorio.obtener()) ??
      ConfiguracionRecordatorios.porDefecto();
    return this.repositorio.guardar(actual.actualizar(cambios));
  }
}
