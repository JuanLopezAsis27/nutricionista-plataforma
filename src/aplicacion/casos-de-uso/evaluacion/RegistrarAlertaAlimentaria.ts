import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  AlertaAlimentaria,
  type DatosNuevaAlertaAlimentaria,
} from "@/dominio/entidades/AlertaAlimentaria";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Caso de uso: registrar una alergia/intolerancia/restricción del paciente. */
export class RegistrarAlertaAlimentaria {
  constructor(
    private readonly alertas: IAlertaAlimentariaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    datos: DatosNuevaAlertaAlimentaria,
  ): Promise<AlertaAlimentaria> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    const alerta = AlertaAlimentaria.crear(datos, crypto.randomUUID());
    return this.alertas.crear(alerta);
  }
}
