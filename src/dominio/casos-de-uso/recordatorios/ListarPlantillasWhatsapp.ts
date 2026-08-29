import type { IPlantillaWhatsappRepositorio } from "../../repositorios/IPlantillaWhatsappRepositorio";
import type { PlantillaWhatsapp } from "../../entidades/PlantillaWhatsapp";

/** Caso de uso: listar las plantillas de recordatorio del consultorio. */
export class ListarPlantillasWhatsapp {
  constructor(private readonly plantillas: IPlantillaWhatsappRepositorio) {}

  async ejecutar(): Promise<PlantillaWhatsapp[]> {
    return this.plantillas.listar();
  }
}
