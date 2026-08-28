import type { IPlantillaAntropometricaRepositorio } from "../../repositorios/IPlantillaAntropometricaRepositorio";
import type { PlantillaAntropometrica } from "../../entidades/PlantillaAntropometrica";

/** Caso de uso: listar las plantillas de carga del consultorio. */
export class ObtenerPlantillasAntropometricas {
  constructor(
    private readonly plantillas: IPlantillaAntropometricaRepositorio,
  ) {}

  async ejecutar(): Promise<PlantillaAntropometrica[]> {
    return this.plantillas.listar();
  }
}
