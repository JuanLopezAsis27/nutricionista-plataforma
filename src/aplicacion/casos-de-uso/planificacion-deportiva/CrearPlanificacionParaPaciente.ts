import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import type {
  PlanificacionDeportiva,
  DatosNuevaPlanificacion,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { obtenerOCrearCarpetaDelPaciente } from "../grupos-plan/carpetaDelPaciente";
import type { CrearPlanificacion } from "./CrearPlanificacion";
import {
  verificarCompetenciaDelPaciente,
  type AsignarPlanificacionAPaciente,
} from "./AsignarPlanificacionAPaciente";

export interface DatosCrearPlanificacionParaPaciente extends Omit<
  DatosNuevaPlanificacion,
  "grupoId"
> {
  pacienteId: string;
  /** La competencia de su calendario para la que es (opcional). */
  competenciaId?: string | null;
}

/**
 * Caso de uso: crear una planificación desde la FICHA del paciente. Va a la
 * carpeta con su nombre —la primera vez se crea, como con los planes
 * (`obtenerOCrearCarpetaDelPaciente`)— y queda asignada a él, atada a la
 * competencia si se eligió una.
 *
 * Es un solo paso y no «crear» + «mover» + «asignar» desde la pantalla: si
 * alguno fallara a mitad de camino quedaría una planificación suelta que el
 * paciente no ve.
 *
 * La competencia se valida ANTES de crear: si fuera de otro paciente, la
 * asignación fallaría con la planificación ya escrita.
 */
export class CrearPlanificacionParaPaciente {
  constructor(
    private readonly crearUC: CrearPlanificacion,
    private readonly asignarUC: AsignarPlanificacionAPaciente,
    private readonly grupos: IGrupoPlanRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly competencias: ICompetenciaRepositorio,
  ) {}

  async ejecutar(
    datos: DatosCrearPlanificacionParaPaciente,
  ): Promise<PlanificacionDeportiva> {
    const { pacienteId, competenciaId, ...planificacion } = datos;
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) throw new ErrorPacienteNoEncontrado(pacienteId);
    if (competenciaId) {
      await verificarCompetenciaDelPaciente(
        this.competencias,
        pacienteId,
        competenciaId,
      );
    }

    const carpeta = await obtenerOCrearCarpetaDelPaciente(
      this.grupos,
      pacienteId,
      paciente.nombreCompleto,
    );
    const creada = await this.crearUC.ejecutar({
      ...planificacion,
      grupoId: carpeta.id,
    });
    await this.asignarUC.ejecutar({
      planificacionId: creada.id,
      pacienteId,
      competenciaId: competenciaId ?? null,
    });
    return creada;
  }
}
