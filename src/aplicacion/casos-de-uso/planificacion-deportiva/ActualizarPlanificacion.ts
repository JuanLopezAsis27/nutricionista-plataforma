import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type {
  PlanificacionDeportiva,
  DatosPlanificacion,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { ErrorPlanificacionNoEncontrada } from "@/dominio/errores/ErrorPlanificacionNoEncontrada";
import { ErrorPlanificacionDuplicada } from "@/dominio/errores/ErrorPlanificacionDuplicada";

/**
 * Caso de uso: editar una planificación. Reemplaza el contenido entero
 * (datos de la carrera e ingestas), como el editor de un plan; el tipo y la
 * carpeta no cambian por acá.
 *
 * Si está asignada a varios pacientes, el cambio lo ven todos: es la misma
 * planificación. Para adaptarla a uno solo, se la duplica.
 *
 * `esperadoEn` es el `actualizadoEn` que leyó el formulario: viaja hasta el
 * WHERE del UPDATE (no a un `if` acá, que dejaría una ventana entre comparar
 * y escribir). Es opcional, como en los planes.
 */
export class ActualizarPlanificacion {
  constructor(
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
  ) {}

  async ejecutar(
    id: string,
    datos: DatosPlanificacion,
    esperadoEn?: Date,
  ): Promise<PlanificacionDeportiva> {
    const actual = await this.planificaciones.obtenerPorId(id);
    if (!actual) throw new ErrorPlanificacionNoEncontrada(id);
    const editada = actual.actualizar(datos, () => crypto.randomUUID());
    if (await this.planificaciones.existeNombre(editada.nombre, id)) {
      throw new ErrorPlanificacionDuplicada(editada.nombre);
    }
    return this.planificaciones.actualizar(editada, esperadoEn);
  }
}
