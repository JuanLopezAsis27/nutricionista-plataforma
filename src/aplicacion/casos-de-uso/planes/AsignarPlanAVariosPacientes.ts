import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type {
  IPlanRepositorio,
  AsignacionPlan,
} from "@/dominio/repositorios/IPlanRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { verificarPlanAsignable } from "./AsignarPlanAPaciente";

/** Entrada: un plan, varios pacientes. */
export interface DatosAsignarPlanAVarios {
  planId: string;
  pacienteIds: string[];
}

/** Una asignación lograda, o el motivo por el que ese paciente no lo recibió. */
export interface ResultadoAsignacionMultiple {
  pacienteId: string;
  asignacion: AsignacionPlan | null;
  error: string | null;
}

/**
 * Caso de uso: asignar el MISMO plan a varios pacientes a la vez, desde la
 * pantalla general de planes ("Asignar a paciente" ya no elige uno solo).
 *
 * Es la misma asignación que `AsignarPlanAPaciente` repetida, no una nueva:
 * la regla de qué plan se puede asignar es la misma función
 * (`verificarPlanAsignable`) y los chequeos van en el mismo orden —primero el
 * paciente, después el plan—, así que cada paciente recibe el mismo motivo que
 * recibiría asignándolo de a uno. Lo que cambia es que el plan y los pacientes
 * se leen UNA vez para todo el lote: leer un plan son varias consultas (una
 * por relación incluida) y antes se repetían por cada paciente.
 *
 * Cada paciente es independiente —el plan se suma a los que ya tenga—, así
 * que uno que falla (no existe, el plan es una plantilla) no aborta a los
 * demás: se junta el error y se sigue, porque a mitad de una tanda de diez
 * nadie quiere perder las nueve que sí iban a andar.
 */
export class AsignarPlanAVariosPacientes {
  constructor(
    private readonly planes: IPlanRepositorio,
    private readonly asignaciones: IAsignacionPlanRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    datos: DatosAsignarPlanAVarios,
  ): Promise<ResultadoAsignacionMultiple[]> {
    const pacienteIds = [...new Set(datos.pacienteIds)];
    if (pacienteIds.length === 0) return [];

    const [plan, encontrados] = await Promise.all([
      this.planes.obtenerPorId(datos.planId),
      this.pacientes.obtenerPorIds(pacienteIds),
    ]);
    const existentes = new Set(encontrados.map((paciente) => paciente.id));
    let motivoDelPlan: string | null = null;
    try {
      verificarPlanAsignable(plan, datos.planId);
    } catch (error) {
      motivoDelPlan = mensajeDe(error);
    }

    const resultados: ResultadoAsignacionMultiple[] = [];
    for (const pacienteId of pacienteIds) {
      const motivo = existentes.has(pacienteId)
        ? motivoDelPlan
        : new ErrorPacienteNoEncontrado(pacienteId).message;
      if (motivo !== null) {
        resultados.push({ pacienteId, asignacion: null, error: motivo });
        continue;
      }
      try {
        const asignacion = await this.asignaciones.asignarAPaciente({
          id: crypto.randomUUID(),
          planId: datos.planId,
          pacienteId,
        });
        resultados.push({ pacienteId, asignacion, error: null });
      } catch (error) {
        resultados.push({
          pacienteId,
          asignacion: null,
          error: mensajeDe(error),
        });
      }
    }
    return resultados;
  }
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido.";
}
