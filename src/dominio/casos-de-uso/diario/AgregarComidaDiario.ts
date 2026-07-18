import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import {
  RegistroDiario,
  type DatosNuevaComidaConsumida,
} from "../../entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: agregar una comida a la hoja del día.
 * Si el día todavía no tiene registro, lo crea vacío primero (el paciente
 * puede arrancar el día registrando el desayuno).
 */
export class AgregarComidaDiario {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    fecha: Date,
    datos: DatosNuevaComidaConsumida,
  ): Promise<RegistroDiario> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    let registro = await this.registros.obtenerPorPacienteYFecha(pacienteId, fecha);
    if (!registro) {
      registro = await this.registros.crear(
        RegistroDiario.crear({ pacienteId, fecha }, crypto.randomUUID()),
      );
    }

    const comida = RegistroDiario.crearComida(datos, crypto.randomUUID());
    await this.registros.agregarComida(registro.id, comida);

    const actualizado = await this.registros.obtenerPorPacienteYFecha(pacienteId, fecha);
    return actualizado ?? registro;
  }
}
