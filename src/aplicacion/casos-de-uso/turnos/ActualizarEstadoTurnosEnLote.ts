import type { EstadoTurno } from "@/dominio/entidades/Turno";
import type { ActualizarEstadoTurno } from "./ActualizarEstadoTurno";
import { aplicarEnLote, type ResultadoLoteTurnos } from "./resultadoLote";

/**
 * Caso de uso: llevar varios turnos al mismo estado de una vez (la selección
 * múltiple de la lista de turnos).
 *
 * Compone `ActualizarEstadoTurno` turno por turno: la máquina de estados es
 * UNA sola, y un camino en lote con reglas propias terminaría dejando pasar lo
 * que el individual rechaza. Los que no admiten la transición (un PENDIENTE no
 * pasa directo a COMPLETADO, un CANCELADO no vuelve) se omiten con el motivo.
 */
export class ActualizarEstadoTurnosEnLote {
  constructor(private readonly actualizarEstado: ActualizarEstadoTurno) {}

  async ejecutar(
    ids: ReadonlyArray<string>,
    nuevoEstado: EstadoTurno,
  ): Promise<ResultadoLoteTurnos> {
    return aplicarEnLote(ids, async (id) => {
      return this.actualizarEstado.ejecutar(id, nuevoEstado);
    });
  }
}
