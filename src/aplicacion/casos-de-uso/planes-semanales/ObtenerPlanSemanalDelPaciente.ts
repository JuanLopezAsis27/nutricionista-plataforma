import type { IAsignacionPlanSemanalRepositorio } from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { PlanSemanal, DiaSemana } from "@/dominio/entidades/PlanSemanal";
import type { Macros } from "@/dominio/servicios/macrosAlimentos";
import {
  compararConMetas,
  type ComparacionDia,
  type MetasDiarias,
} from "@/dominio/servicios/comparacionMacros";

/** Un día del plan semanal con su total y cómo quedó frente a las metas. */
export interface DiaComparado {
  dia: DiaSemana;
  macros: Macros;
  comparacion: ComparacionDia;
}

/** El plan semanal vigente del paciente, ya comparado contra sus metas. */
export interface PlanSemanalDelPaciente {
  plan: PlanSemanal;
  /** Metas diarias, o null si no hay contra qué comparar. */
  metas: MetasDiarias | null;
  /**
   * De qué plan nutricional salieron las metas. Puede venir con nombre y con
   * `metas` en null: ese plan existe pero no declara macros.
   */
  nombrePlanDeLasMetas: string | null;
  dias: DiaComparado[];
}

/**
 * Caso de uso: el plan semanal que sigue hoy el paciente, con el total de cada
 * día comparado contra sus metas diarias.
 *
 * Las metas salen del PLAN NUTRICIONAL asignado, no del plan semanal. Son dos
 * cosas distintas y ese es justamente el punto: el plan fija cuánto tiene que
 * comer por día y el semanal es una manera concreta de repartirlo, así que la
 * comparación es lo que dice si el menú de la semana cumple la pauta. Si el
 * plan semanal llevara metas propias, se estaría comparando consigo mismo.
 *
 * Por eso lee los dos historiales: el semanal para el menú y el de planes para
 * la pauta. Que el paciente tenga uno y no el otro es normal —se puede
 * entregar un menú antes de cerrar los macros— y ahí devuelve los totales sin
 * comparación en vez de fallar.
 */
export class ObtenerPlanSemanalDelPaciente {
  constructor(
    private readonly semanales: IAsignacionPlanSemanalRepositorio,
    private readonly planes: IAsignacionPlanRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<PlanSemanalDelPaciente | null> {
    const plan =
      await this.semanales.obtenerPlanSemanalActivoDePaciente(pacienteId);
    if (!plan) return null;

    const planDeMetas =
      await this.planes.obtenerPlanActivoDePaciente(pacienteId);
    const metas = planDeMetas ? metasDe(planDeMetas.aPrimitivos()) : null;

    return {
      plan,
      metas,
      nombrePlanDeLasMetas: planDeMetas?.nombre ?? null,
      dias: plan.totalesPorDia().map(({ dia, macros }) => ({
        dia,
        macros,
        comparacion: compararConMetas(macros, metas),
      })),
    };
  }
}

/**
 * Las metas del plan nutricional como metas diarias, o null si no declara
 * ninguna.
 *
 * Null y «las cuatro en null» no son lo mismo para la pantalla: el primero es
 * «este plan no fija macros» y el segundo no existiría. Devolver null deja que
 * la vista diga qué falta en vez de mostrar cuatro guiones sin explicación.
 */
function metasDe(plan: {
  caloriasMeta: number | null;
  proteinasMetaG: number | null;
  carbohidratosMetaG: number | null;
  grasasMetaG: number | null;
}): MetasDiarias | null {
  const metas: MetasDiarias = {
    calorias: plan.caloriasMeta,
    proteinasG: plan.proteinasMetaG,
    carbohidratosG: plan.carbohidratosMetaG,
    grasasG: plan.grasasMetaG,
  };
  const hayAlguna = Object.values(metas).some((valor) => valor != null);
  return hayAlguna ? metas : null;
}
