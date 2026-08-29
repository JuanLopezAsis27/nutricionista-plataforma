import type { ITurnoRepositorio } from "../../repositorios/ITurnoRepositorio";
import type { Turno } from "../../entidades/Turno";
import { ErrorTurnoNoEncontrado } from "../../errores/ErrorTurnoNoEncontrado";

/**
 * Caso de uso: registrar el cobro de un turno (precio y si está pagado).
 *
 * La validación (precio no negativo, no marcar pagado sin precio) vive en la
 * entidad Turno.registrarCobro. Alimenta el cálculo de ingresos de las
 * estadísticas.
 */
export class RegistrarCobroTurno {
  constructor(private readonly turnos: ITurnoRepositorio) {}

  async ejecutar(
    id: string,
    precio: number | null,
    pagado: boolean,
  ): Promise<Turno> {
    const turno = await this.turnos.obtenerPorId(id);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(id);
    }

    turno.registrarCobro(precio, pagado); // valida invariantes de dominio
    return this.turnos.actualizar(turno);
  }
}
