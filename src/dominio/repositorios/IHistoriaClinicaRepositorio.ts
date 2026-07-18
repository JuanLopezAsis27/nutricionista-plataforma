import type { HistoriaClinica } from "../entidades/HistoriaClinica";

/** Contrato de persistencia para la historia clínica (una por paciente). */
export interface IHistoriaClinicaRepositorio {
  /** Crea o reemplaza la historia del paciente (upsert). */
  guardar(historia: HistoriaClinica): Promise<HistoriaClinica>;
  obtenerPorPaciente(pacienteId: string): Promise<HistoriaClinica | null>;
}
