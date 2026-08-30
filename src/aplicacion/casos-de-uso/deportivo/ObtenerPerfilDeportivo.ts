import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { PerfilDeportivo } from "@/dominio/entidades/PerfilDeportivo";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Caso de uso: obtener el perfil deportivo de un paciente (o null si no tiene). */
export class ObtenerPerfilDeportivo {
  constructor(
    private readonly perfiles: IPerfilDeportivoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<PerfilDeportivo | null> {
    // Guard de pertenencia: el paciente debe ser del inquilino actual.
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    return this.perfiles.obtenerPorPaciente(pacienteId);
  }
}
