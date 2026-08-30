import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { RegistroDiario } from "@/dominio/entidades/RegistroDiario";

/**
 * Caso de uso: obtener la hoja de un día del paciente.
 * Devuelve null si ese día no tiene nada registrado (no es un error).
 */
export class ObtenerDia {
  constructor(private readonly registros: IRegistroDiarioRepositorio) {}

  async ejecutar(
    pacienteId: string,
    fecha: Date,
  ): Promise<RegistroDiario | null> {
    return this.registros.obtenerPorPacienteYFecha(pacienteId, fecha);
  }
}
