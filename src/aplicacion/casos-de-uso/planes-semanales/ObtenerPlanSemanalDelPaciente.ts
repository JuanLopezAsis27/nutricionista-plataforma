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
   * De qué plan nutricional salieron las metas. El paciente puede tener varios
   * asignados, así que la pantalla tiene que poder decir cuál dio los números.
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
 * Por eso lee las dos asignaciones: la semanal para el menú y la de planes
 * para la pauta. Que el paciente tenga una y no la otra es normal —se puede
 * entregar un menú antes de cerrar los macros— y ahí devuelve los totales sin
 * comparación en vez de fallar.
 *
 * Con VARIOS planes asignados (migración 69) las metas salen del PRIMERO que
 * declare macros, y su nombre viaja en `nombrePlanDeLasMetas` para que la
 * pantalla diga de dónde salieron: ninguno rige sobre los otros, así que
 * elegir en silencio sería inventar una jerarquía. Los que no declaran macros
 * no compiten —no tienen nada que aportar a la comparación—.
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

    const asignados = await this.planes.listarPlanesDePaciente(pacienteId);
    const conMetas = asignados
      .map((p) => ({ plan: p, metas: metasDe(p.aPrimitivos()) }))
      .find(({ metas }) => metas !== null);
    // Sin ninguno que declare macros, el nombre sigue siendo el del primer plan
    // asignado: la pantalla dice "«X» no fija metas" en vez de callarse.
    const planDeMetas = conMetas?.plan ?? asignados[0] ?? null;
    const metas = conMetas?.metas ?? null;

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
