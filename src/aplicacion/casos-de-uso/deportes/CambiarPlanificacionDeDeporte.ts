import type { IDeporteRepositorio } from "@/dominio/repositorios/IDeporteRepositorio";
import type { Deporte } from "@/dominio/entidades/Deporte";
import type { FormatoPlanificacion } from "@/dominio/entidades/PlanificacionDeportiva";
import { ErrorDeporteNoEncontrado } from "@/dominio/errores/ErrorDeporteNoEncontrado";

/**
 * Caso de uso: decir qué planificación deportiva le corresponde a un deporte
 * (migración 98), o que todavía ninguna. Solo el SUPERADMIN.
 *
 * No toca las planificaciones ya hechas ni los perfiles: cambia con qué
 * ARRANCA la próxima planificación de quien hace ese deporte, y si la ficha
 * se la ofrece.
 */
export class CambiarPlanificacionDeDeporte {
  constructor(private readonly deportes: IDeporteRepositorio) {}

  async ejecutar(
    id: string,
    formato: FormatoPlanificacion | null,
  ): Promise<Deporte> {
    const actual = await this.deportes.obtenerPorId(id);
    if (!actual) throw new ErrorDeporteNoEncontrado(id);
    return this.deportes.actualizar(actual.conFormato(formato));
  }
}
