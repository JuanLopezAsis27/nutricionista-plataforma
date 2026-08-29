import type { PlantillaWhatsapp } from "../entidades/PlantillaWhatsapp";

/** Contrato de persistencia de las plantillas de recordatorio por WhatsApp. */
export interface IPlantillaWhatsappRepositorio {
  listar(): Promise<PlantillaWhatsapp[]>;
  obtenerPorId(id: string): Promise<PlantillaWhatsapp | null>;
  /** La marcada como predeterminada, que es la que usa el barrido automático. */
  obtenerPredeterminada(): Promise<PlantillaWhatsapp | null>;
  crear(plantilla: PlantillaWhatsapp): Promise<PlantillaWhatsapp>;
  actualizar(plantilla: PlantillaWhatsapp): Promise<PlantillaWhatsapp>;
  eliminar(id: string): Promise<void>;
}
