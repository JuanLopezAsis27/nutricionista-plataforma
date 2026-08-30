import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Paciente } from "@/dominio/entidades/Paciente";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: dar de baja a un paciente sin borrarlo.
 *
 * Es la alternativa real a `eliminar`, que arrastra en cascada toda la historia
 * clínica. Un paciente archivado desaparece de los listados y deja de contar en
 * las estadísticas, pero conserva turnos, antropometrías y laboratorios.
 *
 * Existe porque `pacientes.activo` se leía en tres consultas de estadísticas y
 * no lo escribía nadie: el KPI "pacientes activos" era en realidad "pacientes
 * totales". Ahora la columna tiene quién la escriba.
 */
export class ArchivarPaciente {
  constructor(private readonly repositorio: IPacienteRepositorio) {}

  async ejecutar(id: string, motivo: string | null = null): Promise<Paciente> {
    const paciente = await this.repositorio.obtenerPorId(id);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(id);
    }
    return this.repositorio.actualizar(paciente.archivar(motivo));
  }
}
