import type { ICampoHistoriaClinicaRepositorio } from "@/dominio/repositorios/ICampoHistoriaClinicaRepositorio";
import type { CampoHistoriaClinica } from "@/dominio/entidades/CampoHistoriaClinica";

/**
 * Caso de uso: los campos personalizados que el consultorio agregó a la
 * historia clínica, en el orden en que se muestran.
 */
export class ObtenerCamposHistoriaClinica {
  constructor(private readonly campos: ICampoHistoriaClinicaRepositorio) {}

  async ejecutar(): Promise<CampoHistoriaClinica[]> {
    return this.campos.obtenerTodos();
  }
}
