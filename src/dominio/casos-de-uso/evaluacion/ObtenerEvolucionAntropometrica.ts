import type { IAntropometriaRepositorio } from "../../repositorios/IAntropometriaRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import {
  Antropometria,
  type DerivadosMedicion,
} from "../../entidades/Antropometria";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Evolución completa: mediciones (asc por fecha) + derivados por medición. */
export interface EvolucionAntropometrica {
  mediciones: Antropometria[];
  derivados: DerivadosMedicion[];
}

/**
 * Caso de uso: obtener la evolución antropométrica del paciente con los
 * derivados de la planilla (Σ6 pliegues, kg bajados por consulta y
 * acumulados) calculados por el dominio.
 */
export class ObtenerEvolucionAntropometrica {
  constructor(
    private readonly antropometrias: IAntropometriaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(pacienteId: string): Promise<EvolucionAntropometrica> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const mediciones = await this.antropometrias.listarPorPaciente(pacienteId);
    return {
      mediciones,
      derivados: Antropometria.calcularDerivados(mediciones),
    };
  }
}
