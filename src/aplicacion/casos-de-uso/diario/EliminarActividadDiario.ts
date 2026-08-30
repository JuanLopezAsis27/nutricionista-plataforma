import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import { ErrorRegistroDiarioNoEncontrado } from "@/dominio/errores/ErrorRegistroDiarioNoEncontrado";
import { ErrorAccesoDenegado } from "@/dominio/errores/ErrorAccesoDenegado";

/** Caso de uso: eliminar una actividad del diario (solo del propio paciente). */
export class EliminarActividadDiario {
  constructor(private readonly registros: IRegistroDiarioRepositorio) {}

  async ejecutar(pacienteId: string, actividadId: string): Promise<void> {
    const actividad = await this.registros.obtenerActividad(actividadId);
    if (!actividad) {
      throw new ErrorRegistroDiarioNoEncontrado("esa actividad en el diario");
    }
    if (actividad.pacienteId !== pacienteId) {
      throw new ErrorAccesoDenegado("La actividad pertenece a otro paciente.");
    }
    await this.registros.eliminarActividad(actividadId);
  }
}
