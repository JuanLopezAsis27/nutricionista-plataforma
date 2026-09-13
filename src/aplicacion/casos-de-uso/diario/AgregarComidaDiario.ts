import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import {
  RegistroDiario,
  type DatosNuevaComidaConsumida,
} from "@/dominio/entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: agregar una comida a la hoja del día.
 * Si el día todavía no tiene registro, lo crea vacío primero (el paciente
 * puede arrancar el día registrando el desayuno).
 */
export class AgregarComidaDiario {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly archivos: IArchivoRepositorio,
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

    let registro = await this.registros.obtenerPorPacienteYFecha(
      pacienteId,
      fecha,
    );
    if (!registro) {
      registro = await this.registros.crear(
        RegistroDiario.crear({ pacienteId, fecha }, crypto.randomUUID()),
      );
    }

    const comida = RegistroDiario.crearComida(datos, crypto.randomUUID());
    await this.registros.agregarComida(registro.id, comida);
    // La foto se sube antes de crear la comida (necesita subirse ya con un
    // Archivo válido), pero el archivo solo puede apuntar a la comida una vez
    // que esta existe: por eso el vínculo es un segundo paso, no un campo más
    // del `create`. Mismo mecanismo que usa `AgregarFotoComida` para una
    // comida que ya tenía foto propia.
    if (comida.fotoArchivoId) {
      await this.archivos.vincularDueno(comida.fotoArchivoId, {
        comidaConsumidaId: comida.id,
      });
    }

    const actualizado = await this.registros.obtenerPorPacienteYFecha(
      pacienteId,
      fecha,
    );
    return actualizado ?? registro;
  }
}
