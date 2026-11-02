import type { IPlanificacionDeportivaRepositorio } from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type { PlanificacionDeportiva } from "@/dominio/entidades/PlanificacionDeportiva";
import { ErrorPlanificacionNoEncontrada } from "@/dominio/errores/ErrorPlanificacionNoEncontrada";
import { ErrorPlanificacionDuplicada } from "@/dominio/errores/ErrorPlanificacionDuplicada";

/** Cuántos nombres se prueban: «(copia)», «(copia 2)»… «(copia 50)». */
const MAX_INTENTOS_DE_NOMBRE = 50;

/**
 * Caso de uso: duplicar una planificación, en la misma carpeta y SIN
 * asignaciones. Es como se adapta una planificación general («Media maratón
 * en 1:45») a un paciente sin cambiársela a los demás que la tienen.
 *
 * El nombre se numera solo («Media maratón (copia)», «(copia 2)»): un nombre
 * repetido es lo que la regla de unicidad viene a evitar, y acá no hay dónde
 * escribir otro.
 */
export class DuplicarPlanificacion {
  constructor(
    private readonly planificaciones: IPlanificacionDeportivaRepositorio,
  ) {}

  async ejecutar(id: string): Promise<PlanificacionDeportiva> {
    const original = await this.planificaciones.obtenerPorId(id);
    if (!original) throw new ErrorPlanificacionNoEncontrada(id);

    const nombre = await this.nombreLibre(original.nombre);
    return this.planificaciones.crear(
      original.duplicar(crypto.randomUUID(), nombre, () => crypto.randomUUID()),
    );
  }

  /** El primer «(copia N)» libre; si se agotan, el error con su mensaje. */
  private async nombreLibre(base: string): Promise<string> {
    for (let intento = 1; intento <= MAX_INTENTOS_DE_NOMBRE; intento += 1) {
      const nombre =
        intento === 1 ? `${base} (copia)` : `${base} (copia ${intento})`;
      if (!(await this.planificaciones.existeNombre(nombre))) return nombre;
    }
    throw new ErrorPlanificacionDuplicada(`${base} (copia)`);
  }
}
