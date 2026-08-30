import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorRecetaNoEncontrada } from "@/dominio/errores/ErrorRecetaNoEncontrada";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: compartir una receta con un paciente (idempotente por la
 * restricción única receta⇄paciente del repositorio).
 */
export class AsignarRecetaAPaciente {
  constructor(
    private readonly recetas: IRecetaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: {
    recetaId: string;
    pacienteId: string;
  }): Promise<void> {
    const receta = await this.recetas.obtenerPorId(datos.recetaId);
    if (!receta) {
      throw new ErrorRecetaNoEncontrada(datos.recetaId);
    }
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    await this.recetas.asignarAPaciente(
      datos.recetaId,
      datos.pacienteId,
      crypto.randomUUID(),
    );
  }
}
