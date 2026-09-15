import type { IPlantillaEmailRecordatorioRepositorio } from "@/dominio/repositorios/IPlantillaEmailRecordatorioRepositorio";
import type { DatosPlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import type { PlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import { ErrorPlantillaEmailRecordatorioNoEncontrada } from "@/dominio/errores/ErrorPlantillaEmailRecordatorioNoEncontrada";
import { desmarcarOtrasPredeterminadas } from "./predeterminada";
import { liberarDiaDeOtras } from "./diaAsignado";

/** Caso de uso: editar una plantilla de recordatorio por email. */
export class ActualizarPlantillaEmailRecordatorio {
  constructor(
    private readonly plantillas: IPlantillaEmailRecordatorioRepositorio,
  ) {}

  async ejecutar(
    id: string,
    cambios: Partial<DatosPlantillaEmailRecordatorio>,
  ): Promise<PlantillaEmailRecordatorio> {
    const plantilla = await this.plantillas.obtenerPorId(id);
    if (!plantilla) {
      throw new ErrorPlantillaEmailRecordatorioNoEncontrada(id);
    }
    if (cambios.predeterminada) {
      await desmarcarOtrasPredeterminadas(
        this.plantillas,
        await this.plantillas.listar(),
        id,
      );
    }
    if (cambios.diasAntes != null) {
      await liberarDiaDeOtras(
        this.plantillas,
        await this.plantillas.listar(),
        cambios.diasAntes,
        id,
      );
    }
    return this.plantillas.actualizar(plantilla.actualizar(cambios));
  }
}
