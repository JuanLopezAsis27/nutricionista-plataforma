import type { ICompetenciaRepositorio } from "../../repositorios/ICompetenciaRepositorio";
import type { Competencia, DatosCompetencia } from "../../entidades/Competencia";
import { ErrorCompetenciaNoEncontrada } from "../../errores/ErrorCompetenciaNoEncontrada";

/** Datos de entrada: id + cambios de la competencia (sin cambiar el paciente). */
export interface DatosActualizarCompetencia extends Omit<DatosCompetencia, "pacienteId"> {
  id: string;
}

/** Caso de uso: editar una competencia (fecha, objetivo, resultado…). */
export class ActualizarCompetencia {
  constructor(private readonly competencias: ICompetenciaRepositorio) {}

  async ejecutar(datos: DatosActualizarCompetencia): Promise<Competencia> {
    const existente = await this.competencias.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorCompetenciaNoEncontrada(datos.id);
    }
    const { id: _id, ...cambios } = datos;
    void _id;
    return this.competencias.actualizar(existente.actualizar(cambios));
  }
}
