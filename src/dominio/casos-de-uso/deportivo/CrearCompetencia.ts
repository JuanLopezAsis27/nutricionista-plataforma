import type { ICompetenciaRepositorio } from "../../repositorios/ICompetenciaRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import {
  Competencia,
  type DatosCompetencia,
} from "../../entidades/Competencia";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Caso de uso: agregar una competencia al calendario del paciente. */
export class CrearCompetencia {
  constructor(
    private readonly competencias: ICompetenciaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosCompetencia): Promise<Competencia> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    const competencia = Competencia.crear(datos, crypto.randomUUID());
    return this.competencias.crear(competencia);
  }
}
