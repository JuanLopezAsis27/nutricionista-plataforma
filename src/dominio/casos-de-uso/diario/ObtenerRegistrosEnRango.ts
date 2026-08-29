import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { RegistroDiario } from "../../entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/**
 * Caso de uso: registros del diario en un rango de fechas (vista del
 * nutricionista en la ficha, y futuros informes de hábitos).
 */
export class ObtenerRegistrosEnRango {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<RegistroDiario[]> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    if (hasta < desde) {
      throw new ErrorValidacion(
        "El fin del rango no puede ser anterior al inicio.",
      );
    }
    return this.registros.listarPorRango(pacienteId, desde, hasta);
  }
}
