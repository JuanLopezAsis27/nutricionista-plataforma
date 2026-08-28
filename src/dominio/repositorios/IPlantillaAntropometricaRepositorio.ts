import type { PlantillaAntropometrica } from "../entidades/PlantillaAntropometrica";

/** Contrato de persistencia para las plantillas de carga de mediciones. */
export interface IPlantillaAntropometricaRepositorio {
  guardar(plantilla: PlantillaAntropometrica): Promise<PlantillaAntropometrica>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<PlantillaAntropometrica | null>;
  /** Plantillas del consultorio, por nombre. */
  listar(): Promise<PlantillaAntropometrica[]>;
}
