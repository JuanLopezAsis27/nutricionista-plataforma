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
  fechaInicio: Date;
  fechaFin?: Date | null;
}

/**
 * Caso de uso: asignar un plan a un paciente.
 *
 * Verifica que existan paciente y plan (y que el plan no sea una plantilla:
 * las plantillas se clonan primero), aplica la regla "un solo plan activo
 * por paciente" desactivando la asignación previa, y crea la nueva.
 *
 * La anterior se cierra con la fecha de INICIO de la nueva, no con "hoy": el
 * plan viejo rigió hasta que empezó el que lo reemplaza. Si el profesional
 * antedata la asignación —"esto arrancó el lunes pasado"—, el historial queda
 * sin huecos ni superposiciones.
 */
export class AsignarPlanAPaciente {
  constructor(
    private readonly planes: IPlanRepositorio,
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

    // Regla: un solo plan activo por paciente → desactivar el anterior.
    await this.planes.desactivarAsignacionesDe(
      datos.pacienteId,
      datos.fechaInicio,
    );

    const asignacion: AsignacionPlan = {
      id: crypto.randomUUID(),
      planId: datos.planId,
      // Foto del nombre: el historial tiene que seguir diciendo qué se asignó
      // aunque después el plan se renombre o se borre.
      nombrePlan: plan.nombre,
      pacienteId: datos.pacienteId,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin ?? null,
      finalizadaEn: null,
      activa: true,
    };

    return this.planes.asignarAPaciente(asignacion);
  }
}
