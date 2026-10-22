import type { IAsignacionPlanSemanalRepositorio } from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import type { PlanSemanal } from "@/dominio/entidades/PlanSemanal";

/**
 * Caso de uso: el plan semanal que sigue hoy el paciente, o null si no tiene.
 *
 * Hasta la migración 91 este caso de uso leía además los PLANES NUTRICIONALES
 * asignados para sacar de ahí las metas contra las que comparar cada día, y
 * con varios asignados (migración 69) tomaba las del primero que declarara
 * macros: la semana se juzgaba con una pauta elegida por orden de llegada.
 * Ahora el plan semanal lleva sus propias metas (`PlanSemanal.metas`) y la
 * comparación es suya (`PlanSemanal.comparacionPorDia`): acá no hay nada que
 * cruzar.
 */
export class ObtenerPlanSemanalDelPaciente {
  constructor(private readonly semanales: IAsignacionPlanSemanalRepositorio) {}

  ejecutar(pacienteId: string): Promise<PlanSemanal | null> {
    return this.semanales.obtenerPlanSemanalActivoDePaciente(pacienteId);
  }
}
