import type { IHistorialIARepositorio } from "@/dominio/repositorios/IHistorialIARepositorio";
import type { ConsultaIA } from "@/dominio/entidades/ConsultaIA";

/** Caso de uso: listar el historial reciente de consultas al asistente. */
export class ListarConsultasIA {
  constructor(private readonly historial: IHistorialIARepositorio) {}

  async ejecutar(pacienteId: string, limite = 30): Promise<ConsultaIA[]> {
    return this.historial.listarConsultas(pacienteId, limite);
  }
}
