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
 * **Solo turnos CANCELADOS**, y es la única condición. Borrar uno pendiente o
 * confirmado sería hacer desaparecer un compromiso vigente sin que nadie lo
 * cancele; y borrar uno COMPLETADO borraría la constancia de una consulta que
 * pasó. No mira la fecha ni la hora: un cancelado de hace un mes se borra
 * igual que uno de mañana.
 *
 * **Tampoco mira el cobro, a pedido del profesional.** Hasta acá un cancelado
 * con precio o pagado no se podía borrar —ya contaba en los ingresos— y la
 * pantalla escondía el botón sin decir por qué: desde afuera parecía que el
 * turno «ya no se podía borrar después de cierta fecha». El cobro se va con
 * el turno y deja de contar en las estadísticas; la pantalla lo advierte en
 * la confirmación, que es donde se decide.
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

    // Antes de la fila, el evento externo: si se borra primero el turno y
    // Google falla, ya no queda de dónde sacar el id del evento.
    await this.sincronizador.alCancelar(id);
    await this.turnos.eliminar(id);
  }
}
