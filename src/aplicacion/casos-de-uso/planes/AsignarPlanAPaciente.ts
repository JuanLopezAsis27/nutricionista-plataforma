import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type {
  IPlanRepositorio,
  AsignacionPlan,
} from "@/dominio/repositorios/IPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorPlanNoEncontrado } from "@/dominio/errores/ErrorPlanNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Entrada del dominio para asignar un plan. */
export interface DatosAsignarPlan {
  planId: string;
  pacienteId: string;
}

/**
 * Qué plan se puede asignar: uno que existe y no es una plantilla. Vive acá,
 * una sola vez, porque la usan la asignación a un paciente y la de varios
 * (`AsignarPlanAVariosPacientes`), que lee el plan UNA vez para todo el lote.
 */
export function verificarPlanAsignable(
  plan: PlanNutricional | null,
  planId: string,
): asserts plan is PlanNutricional {
  if (!plan) {
    throw new ErrorPlanNoEncontrado(planId);
  }
  if (plan.esPlantilla) {
    throw new ErrorValidacion(
      "No se puede asignar una plantilla directamente: creá un plan desde ella primero.",
    );
  }
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
    verificarPlanAsignable(plan, datos.planId);

    return this.asignaciones.asignarAPaciente({
      id: crypto.randomUUID(),
      planId: datos.planId,
      pacienteId: datos.pacienteId,
    });
  }
}
