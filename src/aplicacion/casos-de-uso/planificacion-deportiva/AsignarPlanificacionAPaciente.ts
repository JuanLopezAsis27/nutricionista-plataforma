import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type {
  IAsignacionPlanificacionRepositorio,
  AsignacionPlanificacion,
} from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import { ErrorPlanificacionNoEncontrada } from "@/dominio/errores/ErrorPlanificacionNoEncontrada";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorCompetenciaNoEncontrada } from "@/dominio/errores/ErrorCompetenciaNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

export interface DatosAsignarPlanificacion {
  planificacionId: string;
  pacienteId: string;
  /** Una competencia del calendario de ESE paciente, o null. */
  competenciaId?: string | null;
}

/**
 * Caso de uso: asignar una planificación a un paciente —es lo que la hace
 * visible en su portal—, opcionalmente para una competencia de su
 * calendario. Asignarla otra vez al mismo paciente no la duplica: cambia la
 * competencia.
 *
 * La competencia tiene que ser DEL paciente: la base no lo puede exigir (es
 * otra tabla) y una planificación atada a la carrera de otro mostraría en el
 * portal una fecha y un lugar que no son suyos.
 */
export class AsignarPlanificacionAPaciente {
  constructor(
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
    private readonly asignaciones: IAsignacionPlanificacionRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly competencias: ICompetenciaRepositorio,
  ) {}

  async ejecutar(
    datos: DatosAsignarPlanificacion,
  ): Promise<AsignacionPlanificacion> {
    if (!(await this.planificaciones.obtenerPorId(datos.planificacionId))) {
      throw new ErrorPlanificacionNoEncontrada(datos.planificacionId);
    }
    if (!(await this.pacientes.obtenerPorId(datos.pacienteId))) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    const competenciaId = datos.competenciaId ?? null;
    if (competenciaId) {
      await verificarCompetenciaDelPaciente(
        this.competencias,
        datos.pacienteId,
        competenciaId,
      );
    }

    const existente = await this.asignaciones.obtenerAsignacion(
      datos.planificacionId,
      datos.pacienteId,
    );
    return this.asignaciones.asignar({
      id: existente?.id ?? crypto.randomUUID(),
      planificacionId: datos.planificacionId,
      pacienteId: datos.pacienteId,
      competenciaId,
      creadoEn: existente?.creadoEn ?? new Date(),
    });
  }
}

/** Que la competencia exista y sea del calendario de ESE paciente. */
export async function verificarCompetenciaDelPaciente(
  competencias: ICompetenciaRepositorio,
  pacienteId: string,
  competenciaId: string,
): Promise<void> {
  const competencia = await competencias.obtenerPorId(competenciaId);
  if (!competencia) throw new ErrorCompetenciaNoEncontrada(competenciaId);
  if (competencia.pacienteId !== pacienteId) {
    throw new ErrorValidacion(
      "La competencia elegida es del calendario de otro paciente.",
    );
  }
}
