import type {
  IRetroalimentacionInsightRepositorio,
  DatosRetroalimentacion,
} from "../../repositorios/IRetroalimentacionInsightRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: registrar la corrección del profesional sobre un insight
 * predictivo (👍/👎). Es la etiqueta del loop de feedback. Verifica que el
 * paciente sea del inquilino (guard de pertenencia) antes de guardar.
 */
export class RegistrarRetroalimentacionInsight {
  constructor(
    private readonly repositorio: IRetroalimentacionInsightRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosRetroalimentacion): Promise<void> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    await this.repositorio.registrar(datos);
  }
}
