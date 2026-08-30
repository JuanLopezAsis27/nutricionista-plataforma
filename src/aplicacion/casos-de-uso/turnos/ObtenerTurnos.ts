import type {
  ITurnoRepositorio,
  FiltroTurnos,
} from "@/dominio/repositorios/ITurnoRepositorio";
import type { Turno } from "@/dominio/entidades/Turno";

/**
 * Caso de uso: listar turnos con filtros opcionales (fecha, estado,
 * pacienteId). El repositorio los devuelve ordenados por fecha y hora.
 */
export class ObtenerTurnos {
  constructor(private readonly turnos: ITurnoRepositorio) {}

  async ejecutar(filtro: FiltroTurnos = {}): Promise<Turno[]> {
    return this.turnos.listar(filtro);
  }
}
