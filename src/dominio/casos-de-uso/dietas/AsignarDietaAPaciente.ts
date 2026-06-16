import type {
  IDietaRepositorio,
  AsignacionDieta,
} from "../../repositorios/IDietaRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorDietaNoEncontrada } from "../../errores/ErrorDietaNoEncontrada";

/** Entrada del dominio para asignar una dieta. */
export interface DatosAsignarDieta {
  dietaId: string;
  pacienteId: string;
  fechaInicio: Date;
  fechaFin?: Date | null;
}

/**
 * Caso de uso: asignar una dieta a un paciente.
 *
 * Responsabilidad única: verificar que existan paciente y dieta, aplicar la
 * regla "una sola dieta activa por paciente" (desactivando la asignación
 * activa previa) y crear la nueva asignación activa.
 */
export class AsignarDietaAPaciente {
  constructor(
    private readonly dietas: IDietaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosAsignarDieta): Promise<AsignacionDieta> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const dieta = await this.dietas.obtenerPorId(datos.dietaId);
    if (!dieta) {
      throw new ErrorDietaNoEncontrada(datos.dietaId);
    }

    // Regla: una sola dieta activa por paciente → desactivar la anterior.
    await this.dietas.desactivarAsignacionesDe(datos.pacienteId);

    const asignacion: AsignacionDieta = {
      id: crypto.randomUUID(),
      dietaId: datos.dietaId,
      pacienteId: datos.pacienteId,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin ?? null,
      activa: true,
    };

    return this.dietas.asignarAPaciente(asignacion);
  }
}
