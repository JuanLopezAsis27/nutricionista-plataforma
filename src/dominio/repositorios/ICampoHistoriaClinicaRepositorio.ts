import type { CampoHistoriaClinica } from "../entidades/CampoHistoriaClinica";

/**
 * Contrato de persistencia de los campos personalizados que el consultorio
 * agrega a la historia clínica (uno por inquilino, no por paciente).
 */
export interface ICampoHistoriaClinicaRepositorio {
  obtenerTodos(): Promise<CampoHistoriaClinica[]>;
  obtenerPorId(id: string): Promise<CampoHistoriaClinica | null>;
  /** Busca por nombre para no dar de alta dos campos que se llaman igual. */
  obtenerPorNombre(nombre: string): Promise<CampoHistoriaClinica | null>;
  crear(campo: CampoHistoriaClinica): Promise<CampoHistoriaClinica>;
  actualizar(campo: CampoHistoriaClinica): Promise<CampoHistoriaClinica>;
  eliminar(id: string): Promise<void>;
}
