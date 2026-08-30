import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { RegistroDiario } from "@/dominio/entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

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
