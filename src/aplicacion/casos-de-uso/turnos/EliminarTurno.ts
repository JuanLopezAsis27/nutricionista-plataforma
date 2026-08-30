import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { ISincronizadorCalendario } from "@/dominio/servicios/ISincronizadorCalendario";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: borrar un turno cancelado de la agenda, definitivamente.
 *
 * Cancelar es una baja lógica: el turno queda en la grilla como CANCELADO,
 * porque saber que alguien no vino —y cuándo— es información clínica y de
 * cobranza. Pero un turno que se cargó mal, o que se canceló apenas creado,
 * solo ensucia la agenda: para esos está este borrado.
 *
 * Dos condiciones, y las dos son deliberadas:
 *
 *   1. **Solo turnos CANCELADOS.** Borrar uno pendiente o confirmado sería
 *      hacer desaparecer un compromiso vigente sin que nadie lo cancele; y
 *      borrar uno COMPLETADO borraría la constancia de una consulta que pasó.
 *   2. **Sin cobro registrado.** Un turno con precio o marcado como pagado ya
 *      entró en las estadísticas de ingresos: borrarlo descuadra la caja de un
 *      mes cerrado. Primero hay que sacarle el cobro, que es una decisión
 *      explícita y visible.
 *
 * Los recordatorios del turno se van con él (la FK es ON DELETE CASCADE): son
 * el registro de un aviso sobre algo que ya no existe. El evento del
 * calendario externo se borra también, para no dejarle al paciente un turno
 * fantasma; si Google falla, el borrado sigue igual (best-effort).
 */
export class EliminarTurno {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly sincronizador: ISincronizadorCalendario,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const turno = await this.turnos.obtenerPorId(id);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(id);
    }
    if (turno.estado !== "CANCELADO") {
      throw new ErrorValidacion(
        "Solo se pueden borrar turnos cancelados. Cancelalo primero.",
      );
    }
    if (turno.precio != null || turno.pagado) {
      throw new ErrorValidacion(
        "Este turno tiene un cobro registrado. Quitale el cobro antes de borrarlo.",
      );
    }

    // Antes de la fila, el evento externo: si se borra primero el turno y
    // Google falla, ya no queda de dónde sacar el id del evento.
    await this.sincronizador.alCancelar(id);
    await this.turnos.eliminar(id);
  }
}
