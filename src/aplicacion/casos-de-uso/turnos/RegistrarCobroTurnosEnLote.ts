import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { RegistrarCobroTurno } from "./RegistrarCobroTurno";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { aplicarEnLote, type ResultadoLoteTurnos } from "./resultadoLote";

/**
 * Qué cambiar del cobro. Un campo AUSENTE no se toca: «marcar pagados» manda
 * solo `pagado` y respeta el precio que ya tenía cada turno, y «poner $15.000»
 * manda solo `precio` y no le borra el pago a ninguno.
 */
export interface CambiosCobroLote {
  /** Número, o null para dejarlo sin cargo. */
  precio?: number | null;
  pagado?: boolean;
}

/**
 * Caso de uso: registrar el cobro de varios turnos de una vez.
 *
 * Cada turno pasa por `RegistrarCobroTurno`, así que valen las mismas reglas
 * de la entidad: un turno sin precio no se marca pagado (se omite, y la
 * pantalla dice cuál), y un precio negativo no entra.
 *
 * Dejar un turno sin cargo le saca también el pago si no se dijo nada del
 * pago: «pagado» sin precio es justo lo que la entidad prohíbe, y obligar a
 * mandar las dos cosas para vaciar el precio haría fallar el caso obvio.
 */
export class RegistrarCobroTurnosEnLote {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly registrarCobro: RegistrarCobroTurno,
  ) {}

  async ejecutar(
    ids: ReadonlyArray<string>,
    cambios: CambiosCobroLote,
  ): Promise<ResultadoLoteTurnos> {
    return aplicarEnLote(ids, async (id) => {
      const turno = await this.turnos.obtenerPorId(id);
      if (!turno) throw new ErrorTurnoNoEncontrado(id);

      const precio =
        cambios.precio === undefined ? turno.precio : cambios.precio;
      const pagado =
        cambios.pagado !== undefined
          ? cambios.pagado
          : precio == null
            ? false
            : turno.pagado;
      return this.registrarCobro.ejecutar(id, precio, pagado);
    });
  }
}
