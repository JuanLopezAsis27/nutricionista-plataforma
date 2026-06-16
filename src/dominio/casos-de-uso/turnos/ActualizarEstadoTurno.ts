import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { Turno, EstadoTurno } from "../../entidades/Turno";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";

/**
 * Caso de uso: cambiar el estado de un turno.
 *
 * Verifica que el turno exista y delega la validación de la transición en la
 * entidad (Turno.cambiarEstado aplica la máquina de estados: PENDIENTE →
 * CONFIRMADO|CANCELADO, CONFIRMADO → COMPLETADO|CANCELADO, y CANCELADO/
 * COMPLETADO como estados finales). Lanza ErrorValidacion si es inválida.
 */
export class ActualizarEstadoTurno {
  constructor(private readonly turnos: ITurnoRepositorio) {}

  async ejecutar(id: string, nuevoEstado: EstadoTurno): Promise<Turno> {
    const turno = await this.turnos.obtenerPorId(id);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(id);
    }

    turno.cambiarEstado(nuevoEstado); // valida la transición (regla de dominio)
    return this.turnos.actualizar(turno);
  }
}
