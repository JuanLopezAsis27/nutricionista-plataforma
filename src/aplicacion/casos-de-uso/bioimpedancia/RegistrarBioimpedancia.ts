import type { IBioimpedanciaRepositorio } from "@/dominio/repositorios/IBioimpedanciaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  Bioimpedancia,
  type DatosNuevaBioimpedancia,
} from "@/dominio/entidades/Bioimpedancia";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorBioimpedanciaDuplicada } from "@/dominio/errores/ErrorBioimpedanciaDuplicada";

/**
 * Caso de uso: registrar lo que informó la balanza de bioimpedancia en una
 * consulta. Una sola medición por paciente y fecha.
 */
export class RegistrarBioimpedancia {
  constructor(
    private readonly bioimpedancias: IBioimpedanciaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosNuevaBioimpedancia): Promise<Bioimpedancia> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const medicion = Bioimpedancia.crear(datos, crypto.randomUUID());

    if (
      await this.bioimpedancias.existeEnFecha(datos.pacienteId, medicion.fecha)
    ) {
      throw new ErrorBioimpedanciaDuplicada(medicion.fecha);
    }

    return this.bioimpedancias.crear(medicion);
  }
}
