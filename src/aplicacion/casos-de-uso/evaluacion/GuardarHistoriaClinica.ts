import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  HistoriaClinica,
  type DatosHistoriaClinica,
} from "@/dominio/entidades/HistoriaClinica";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: crear o actualizar la historia clínica del paciente (upsert).
 * Cada paciente tiene a lo sumo una historia; si existe, se actualizan los
 * campos informados.
 */
export class GuardarHistoriaClinica {
  constructor(
    private readonly historias: IHistoriaClinicaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosHistoriaClinica): Promise<HistoriaClinica> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const existente = await this.historias.obtenerPorPaciente(datos.pacienteId);
    const historia = existente
      ? existente.actualizar(datos)
      : HistoriaClinica.crear(datos, crypto.randomUUID());

    return this.historias.guardar(historia);
  }
}
