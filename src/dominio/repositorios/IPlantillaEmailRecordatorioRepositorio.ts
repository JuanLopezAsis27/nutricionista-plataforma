import type { PlantillaEmailRecordatorio } from "../entidades/PlantillaEmailRecordatorio";

/** Contrato de persistencia de las plantillas de recordatorio por email. */
export interface IPlantillaEmailRecordatorioRepositorio {
  listar(): Promise<PlantillaEmailRecordatorio[]>;
  obtenerPorId(id: string): Promise<PlantillaEmailRecordatorio | null>;
  /** La marcada como predeterminada: la que usa el barrido cuando el escalón no tiene una propia, y siempre los envíos manuales. */
  obtenerPredeterminada(): Promise<PlantillaEmailRecordatorio | null>;
  /** La activa asignada a ese escalón de anticipación, si hay una. */
  obtenerPorDia(diasAntes: number): Promise<PlantillaEmailRecordatorio | null>;
  crear(
    plantilla: PlantillaEmailRecordatorio,
  ): Promise<PlantillaEmailRecordatorio>;
  actualizar(
    plantilla: PlantillaEmailRecordatorio,
  ): Promise<PlantillaEmailRecordatorio>;
  eliminar(id: string): Promise<void>;
}
