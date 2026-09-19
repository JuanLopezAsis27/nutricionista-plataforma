import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type {
  IPlanRepositorio,
  AsignacionPlan,
} from "@/dominio/repositorios/IPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Entrada del dominio para asignar un plan. */
export interface DatosAsignarPlan {
  planId: string;
  pacienteId: string;
}

/**
 * Caso de uso: asignar un plan a un paciente.
 *
 * Verifica que existan paciente y plan (y que el plan no sea una plantilla:
 * las plantillas se clonan primero) y crea el vínculo.
 *
 * **Suma, no reemplaza**: el paciente puede tener varios planes a la vez y
 * este se agrega a los que ya tenga. Para sacarle uno está
 * `DesasignarPlanDePaciente`, que nombra cuál.
 *
 * Asignar dos veces el mismo plan al mismo paciente no duplica nada: el
 * repositorio es idempotente por la clave única (planId, pacienteId).
 */
export class AsignarPlanAPaciente {
  constructor(
    private readonly planes: IPlanRepositorio,
    private readonly asignaciones: IAsignacionPlanRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosAsignarPlan): Promise<AsignacionPlan> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const plan = await this.planes.obtenerPorId(datos.planId);
    if (!plan) {
      throw new ErrorPlanNoEncontrado(datos.planId);
    }
    if (plan.esPlantilla) {
      throw new ErrorValidacion(
        "No se puede asignar una plantilla directamente: creá un plan desde ella primero.",
      );
    }

    return this.asignaciones.asignarAPaciente({
      id: crypto.randomUUID(),
      planId: datos.planId,
      pacienteId: datos.pacienteId,
    });
  }
}
