import type { IEvolucionRepositorio } from "@/dominio/repositorios/IEvolucionRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Evolucion } from "@/dominio/entidades/Evolucion";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: las evoluciones de un paciente, de la más nueva a la más vieja.
 *
 * El orden lo pone el repositorio y no la pantalla: la ficha se abre para ver
 * cómo viene el paciente AHORA, y la consulta de hace dos años es contexto.
 */
export class ObtenerEvoluciones {
  constructor(
    private readonly evoluciones: IEvolucionRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<Evolucion[]> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.evoluciones.listarPorPaciente(pacienteId);
  }
}
