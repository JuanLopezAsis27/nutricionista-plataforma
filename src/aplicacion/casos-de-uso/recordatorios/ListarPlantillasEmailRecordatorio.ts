import type { IPlantillaEmailRecordatorioRepositorio } from "@/dominio/repositorios/IPlantillaEmailRecordatorioRepositorio";
import type { PlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";

/** Caso de uso: listar las plantillas de recordatorio por email del consultorio. */
export class ListarPlantillasEmailRecordatorio {
  constructor(
    private readonly plantillas: IPlantillaEmailRecordatorioRepositorio,
  ) {}

  async ejecutar(): Promise<PlantillaEmailRecordatorio[]> {
    return this.plantillas.listar();
  }
}
