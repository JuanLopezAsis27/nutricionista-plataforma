import type { ISuplementoRepositorio } from "../../repositorios/ISuplementoRepositorio";
import type { Suplemento } from "../../entidades/Suplemento";

/** Caso de uso: suplementos de un paciente (ficha: todos; portal: activos). */
export class ObtenerSuplementosDelPaciente {
  constructor(private readonly suplementos: ISuplementoRepositorio) {}

  async ejecutar(pacienteId: string, incluirInactivos = false): Promise<Suplemento[]> {
    return this.suplementos.listarPorPaciente(pacienteId, incluirInactivos);
  }
}
