import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import { RegistroDiario, type DatosDia } from "../../entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: guardar la hoja del día (upsert de los escalares).
 * Si el día no existe se crea; si existe se actualizan solo los campos
 * informados. Las comidas y actividades se manejan con sus propios casos
 * de uso (así las fotos vinculadas nunca se pierden).
 */
export class GuardarDia {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosDia): Promise<RegistroDiario> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const existente = await this.registros.obtenerPorPacienteYFecha(
      datos.pacienteId,
      datos.fecha,
    );

    if (existente) {
      return this.registros.actualizarEscalares(existente.actualizarEscalares(datos));
    }
    return this.registros.crear(RegistroDiario.crear(datos, crypto.randomUUID()));
  }
}
