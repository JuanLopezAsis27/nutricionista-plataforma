import type { IPerfilDeportivoRepositorio } from "../../repositorios/IPerfilDeportivoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import {
  PerfilDeportivo,
  type DatosPerfilDeportivo,
} from "../../entidades/PerfilDeportivo";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: crear o actualizar el perfil deportivo de un paciente.
 * Uno por paciente: si ya existe, conserva su id y su creadoEn.
 */
export class GuardarPerfilDeportivo {
  constructor(
    private readonly perfiles: IPerfilDeportivoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosPerfilDeportivo): Promise<PerfilDeportivo> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const existente = await this.perfiles.obtenerPorPaciente(datos.pacienteId);
    const perfil = existente
      ? existente.actualizar(datos)
      : PerfilDeportivo.crear(datos, crypto.randomUUID());
    return this.perfiles.guardar(perfil);
  }
}
