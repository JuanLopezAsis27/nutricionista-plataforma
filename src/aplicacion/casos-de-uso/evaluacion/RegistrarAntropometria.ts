import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  Antropometria,
  type DatosNuevaAntropometria,
} from "@/dominio/entidades/Antropometria";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorAntropometriaDuplicada } from "@/dominio/errores/ErrorAntropometriaDuplicada";

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
