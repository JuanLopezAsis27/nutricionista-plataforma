import type { IMaterialRepositorio } from "../../repositorios/IMaterialRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import { ErrorMaterialNoEncontrado } from "../../errores/ErrorMaterialNoEncontrado";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: compartir un material con un paciente (idempotente por la
 * restricción única material⇄paciente del repositorio).
 */
export class AsignarMaterialAPaciente {
  constructor(
    private readonly materiales: IMaterialRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: { materialId: string; pacienteId: string }): Promise<void> {
    const material = await this.materiales.obtenerPorId(datos.materialId);
    if (!material) {
      throw new ErrorMaterialNoEncontrado(datos.materialId);
    }
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    await this.materiales.asignarAPaciente(
      datos.materialId,
      datos.pacienteId,
      crypto.randomUUID(),
    );
  }
}
