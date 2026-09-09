import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { GrabacionConsulta } from "@/dominio/entidades/GrabacionConsulta";
import type { ResumenConsulta } from "@/dominio/entidades/ResumenConsulta";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";

/** Todo lo grabado de una consulta, con su resumen. */
export interface ConsultaGrabada {
  grabaciones: GrabacionConsulta[];
  resumen: ResumenConsulta | null;
  /**
   * El resumen no cubre todas las transcripciones listas. Lo calcula el
   * dominio y no la pantalla: es la misma comparación que decide si hay que
   * regenerarlo, y en dos lugares se desincroniza.
   */
  resumenDesactualizado: boolean;
}

/** Caso de uso: las grabaciones de un turno y el resumen de la consulta. */
export class ObtenerGrabacionesDeTurno {
  constructor(
    private readonly grabaciones: IGrabacionConsultaRepositorio,
    private readonly turnos: ITurnoRepositorio,
  ) {}

  async ejecutar(turnoId: string): Promise<ConsultaGrabada> {
    // El alcance de inquilino filtra la lectura: si el turno no aparece, no es
    // de este consultorio y no se devuelven sus grabaciones.
    const turno = await this.turnos.obtenerPorId(turnoId);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(turnoId);
    }

    const [grabaciones, resumen] = await Promise.all([
      this.grabaciones.listarPorTurno(turnoId),
      this.grabaciones.obtenerResumen(turnoId),
    ]);

    const listas = grabaciones.filter((g) => g.estado === "LISTA").length;
    return {
      grabaciones,
      resumen,
      resumenDesactualizado:
        resumen != null && resumen.estaDesactualizado(listas),
    };
  }
}
