import type { IAlertaAlimentariaRepositorio } from "../../repositorios/IAlertaAlimentariaRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import {
  AlertaAlimentaria,
  type DatosNuevaAlertaAlimentaria,
} from "../../entidades/AlertaAlimentaria";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Caso de uso: registrar una alergia/intolerancia/restricción del paciente. */
export class RegistrarAlertaAlimentaria {
  constructor(
    private readonly alertas: IAlertaAlimentariaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosNuevaAlertaAlimentaria): Promise<AlertaAlimentaria> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    const alerta = AlertaAlimentaria.crear(datos, crypto.randomUUID());
    return this.alertas.crear(alerta);
  }
}
