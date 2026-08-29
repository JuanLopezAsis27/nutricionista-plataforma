import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type { IGrupoPlanRepositorio } from "../../repositorios/IGrupoPlanRepositorio";
import { ErrorPlanNoEncontrado } from "../../errores/ErrorPlanNoEncontrado";
import { ErrorGrupoPlanNoEncontrado } from "../../errores/ErrorGrupoPlanNoEncontrado";

/** Entrada: qué plan y a qué carpeta (null = sacarlo de la que esté). */
export interface DatosMoverPlan {
  planId: string;
  grupoId: string | null;
}

/**
 * Caso de uso: mover un plan a una carpeta, o sacarlo de la que esté.
 *
 * Existe aparte de `ActualizarPlan` porque ordenar no es editar: pasar un plan
 * de carpeta por el editor completo obligaría a mandar sus comidas, sus
 * archivos y sus recomendaciones enteras para cambiar un solo campo, y
 * cualquier fallo a mitad de camino reescribiría el plan. Acá se toca `grupoId`
 * y nada más.
 */
export class MoverPlanAGrupo {
  constructor(
    private readonly planes: IPlanRepositorio,
    private readonly grupos: IGrupoPlanRepositorio,
  ) {}

  async ejecutar(datos: DatosMoverPlan): Promise<void> {
    const plan = await this.planes.obtenerPorId(datos.planId);
    if (!plan) {
      throw new ErrorPlanNoEncontrado(datos.planId);
    }

    // Se comprueba la carpeta antes de escribir: la FK la rechazaría igual,
    // pero como error de base y no como "esa carpeta no existe".
    if (
      datos.grupoId !== null &&
      !(await this.grupos.obtenerPorId(datos.grupoId))
    ) {
      throw new ErrorGrupoPlanNoEncontrado(datos.grupoId);
    }

    await this.planes.moverAGrupo(datos.planId, datos.grupoId);
  }
}
