import type { ISuplementoRepositorio } from "@/dominio/repositorios/ISuplementoRepositorio";
import type { Suplemento } from "@/dominio/entidades/Suplemento";

/** Caso de uso: suplementos de un paciente (ficha: todos; portal: activos). */
export class ObtenerSuplementosDelPaciente {
  constructor(private readonly suplementos: ISuplementoRepositorio) {}

  async ejecutar(
    pacienteId: string,
    incluirInactivos = false,
  ): Promise<Suplemento[]> {
    return this.suplementos.listarPorPaciente(pacienteId, incluirInactivos);
  }
}
