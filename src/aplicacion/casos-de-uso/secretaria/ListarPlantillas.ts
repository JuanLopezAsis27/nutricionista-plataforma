import type { IPlantillaEmailRepositorio } from "@/dominio/repositorios/IPlantillaEmailRepositorio";
import type { PlantillaEmail } from "@/dominio/entidades/PlantillaEmail";

/** Caso de uso: listar todas las plantillas de email. */
export class ListarPlantillas {
  constructor(private readonly plantillas: IPlantillaEmailRepositorio) {}

  async ejecutar(): Promise<PlantillaEmail[]> {
    return this.plantillas.listar();
  }
}
