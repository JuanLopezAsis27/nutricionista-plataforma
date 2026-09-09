import type { IPlanSemanalRepositorio } from "@/dominio/repositorios/IPlanSemanalRepositorio";
import type {
  IAsignacionPlanSemanalRepositorio,
  AsignacionPlanSemanal,
} from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorPlanSemanalNoEncontrado } from "@/dominio/errores/ErrorPlanSemanalNoEncontrado";

/** Entrada del dominio para asignar un plan semanal. */
export interface DatosAsignarPlanSemanal {
  planSemanalId: string;
  pacienteId: string;
  fechaInicio: Date;
  fechaFin?: Date | null;
}

/**
 * Caso de uso: asignar un plan semanal a un paciente.
 *
 * Misma regla que con el plan nutricional —uno activo por paciente, el anterior
 * se desactiva— y la anterior se cierra con la fecha de INICIO de la nueva, no
 * con «hoy»: el menú viejo rigió hasta que empezó el que lo reemplaza, y si el
 * profesional antedata la asignación el historial queda sin huecos.
 *
 * Es un historial APARTE del de planes: cambiar el menú de la semana no cambia
 * la pauta de macros, y al revés.
 */
export class AsignarPlanSemanalAPaciente {
  constructor(
    private readonly planes: IPlanSemanalRepositorio,
    private readonly asignaciones: IAsignacionPlanSemanalRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    datos: DatosAsignarPlanSemanal,
  ): Promise<AsignacionPlanSemanal> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const plan = await this.planes.obtenerPorId(datos.planSemanalId);
    if (!plan) {
      throw new ErrorPlanSemanalNoEncontrado(datos.planSemanalId);
    }

    await this.asignaciones.desactivarAsignacionesDe(
      datos.pacienteId,
      datos.fechaInicio,
    );

    const asignacion: AsignacionPlanSemanal = {
      id: crypto.randomUUID(),
      planSemanalId: datos.planSemanalId,
      // Foto del nombre: el historial tiene que seguir diciendo qué se asignó
      // aunque después el plan se renombre o se borre.
      nombrePlan: plan.nombre,
      pacienteId: datos.pacienteId,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin ?? null,
      finalizadaEn: null,
      activa: true,
    };

    return this.asignaciones.asignarAPaciente(asignacion);
  }
}
