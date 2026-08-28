import type { IPlantillaAntropometricaRepositorio } from "../../repositorios/IPlantillaAntropometricaRepositorio";
import {
  PlantillaAntropometrica,
  type DatosPlantillaAntropometrica,
} from "../../entidades/PlantillaAntropometrica";
import { ErrorPlantillaAntropometricaNoEncontrada } from "../../errores/ErrorPlantillaAntropometricaNoEncontrada";

/**
 * Caso de uso: crear o editar una plantilla de carga.
 * Con `id` edita la existente (preservando su fecha de creación); sin `id`
 * crea una nueva. La entidad valida que la plantilla alcance para calcular
 * algo, así que acá no hay que repetirlo.
 */
export class GuardarPlantillaAntropometrica {
  constructor(
    private readonly plantillas: IPlantillaAntropometricaRepositorio,
  ) {}

  async ejecutar(
    datos: DatosPlantillaAntropometrica & { id?: string },
  ): Promise<PlantillaAntropometrica> {
    if (datos.id) {
      const existente = await this.plantillas.obtenerPorId(datos.id);
      if (!existente) {
        throw new ErrorPlantillaAntropometricaNoEncontrada(datos.id);
      }
      return this.plantillas.guardar(existente.actualizar(datos));
    }

    return this.plantillas.guardar(
      PlantillaAntropometrica.crear(datos, crypto.randomUUID()),
    );
  }
}
