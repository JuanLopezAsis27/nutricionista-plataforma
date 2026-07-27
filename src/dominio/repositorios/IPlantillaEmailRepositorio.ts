import type { PlantillaEmail } from "../entidades/PlantillaEmail";

/** Contrato de persistencia de las plantillas de email. */
export interface IPlantillaEmailRepositorio {
  crear(plantilla: PlantillaEmail): Promise<PlantillaEmail>;
  actualizar(plantilla: PlantillaEmail): Promise<PlantillaEmail>;
  eliminar(id: string): Promise<void>;
  obtenerPorId(id: string): Promise<PlantillaEmail | null>;
  obtenerPorClave(clave: string): Promise<PlantillaEmail | null>;
  /** Todas las plantillas, ordenadas por nombre. */
  listar(): Promise<PlantillaEmail[]>;
}
