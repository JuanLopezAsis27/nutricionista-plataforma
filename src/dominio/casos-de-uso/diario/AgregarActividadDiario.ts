import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import {
  RegistroDiario,
  type DatosNuevaActividadFisica,
} from "../../entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: agregar una actividad física a la hoja del día.
 * Crea el registro del día si todavía no existe.
 */
export class AgregarActividadDiario {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    fecha: Date,
    datos: DatosNuevaActividadFisica,
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

    const actividad = RegistroDiario.crearActividad(datos, crypto.randomUUID());
    await this.registros.agregarActividad(registro.id, actividad);

    const actualizado = await this.registros.obtenerPorPacienteYFecha(pacienteId, fecha);
    return actualizado ?? registro;
  }
}
