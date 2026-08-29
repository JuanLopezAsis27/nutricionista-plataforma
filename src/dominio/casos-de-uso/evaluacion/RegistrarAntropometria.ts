import type { IAntropometriaRepositorio } from "../../repositorios/IAntropometriaRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import {
  Antropometria,
  type DatosNuevaAntropometria,
} from "../../entidades/Antropometria";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorAntropometriaDuplicada } from "../../errores/ErrorAntropometriaDuplicada";

/**
 * Caso de uso: registrar una medición antropométrica de consulta.
 * Regla: una sola medición por paciente y fecha (como la planilla, una
 * columna por consulta).
 */
export class RegistrarAntropometria {
  constructor(
    private readonly antropometrias: IAntropometriaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosNuevaAntropometria): Promise<Antropometria> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const medicion = Antropometria.crear(datos, crypto.randomUUID());

    if (
      await this.antropometrias.existeEnFecha(datos.pacienteId, medicion.fecha)
    ) {
      throw new ErrorAntropometriaDuplicada(medicion.fecha);
    }

    return this.antropometrias.crear(medicion);
  }
}
