import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { Turno } from "../../entidades/Turno";
import type { ActualizarEstadoTurno } from "./ActualizarEstadoTurno";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/**
 * Caso de uso: cancelar un turno.
 *
 * Solo se puede cancelar un turno PENDIENTE o CONFIRMADO. Verifica la
 * existencia y la condición, y delega el cambio efectivo en
 * ActualizarEstadoTurno (reutiliza su lógica y máquina de estados).
 */
export class CancelarTurno {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly actualizarEstadoTurno: ActualizarEstadoTurno,
  ) {}

  async ejecutar(id: string): Promise<Turno> {
    const turno = await this.turnos.obtenerPorId(id);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(id);
    }
    if (!turno.puedeCancelarse()) {
      throw new ErrorValidacion(
        `No se puede cancelar un turno en estado ${turno.estado}.`,
      );
    }
    return this.actualizarEstadoTurno.ejecutar(id, "CANCELADO");
  }
}
