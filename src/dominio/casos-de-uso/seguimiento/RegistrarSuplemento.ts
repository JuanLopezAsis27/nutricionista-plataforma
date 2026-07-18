import type { ISuplementoRepositorio } from "../../repositorios/ISuplementoRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import { Suplemento, type DatosNuevoSuplemento } from "../../entidades/Suplemento";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Caso de uso: indicar un suplemento a un paciente. */
export class RegistrarSuplemento {
  constructor(
    private readonly suplementos: ISuplementoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosNuevoSuplemento): Promise<Suplemento> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    const suplemento = Suplemento.crear(datos, crypto.randomUUID());
    return this.suplementos.crear(suplemento);
  }
}
