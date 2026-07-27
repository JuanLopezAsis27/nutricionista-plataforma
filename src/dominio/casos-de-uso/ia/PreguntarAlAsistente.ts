import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IObjetivoRepositorio } from "../../repositorios/IObjetivoRepositorio";
import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";
import type { IHistorialIARepositorio } from "../../repositorios/IHistorialIARepositorio";
import type { IAsistenteNutricional } from "../../servicios/IAsistenteNutricional";
import { ConsultaIA } from "../../entidades/ConsultaIA";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Resultado de una consulta al asistente. */
export interface RespuestaAsistente {
  pregunta: string;
  respuesta: string;
}

/**
 * Caso de uso: responder una pregunta del paciente al asistente. Arma el
 * contexto real (nombre, objetivos en curso, si tiene plan), delega en el
 * puerto (stub hoy, Claude a futuro) y guarda la consulta como historial.
 */
export class PreguntarAlAsistente {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly objetivos: IObjetivoRepositorio,
    private readonly planes: IPlanRepositorio,
    private readonly asistente: IAsistenteNutricional,
    private readonly historial: IHistorialIARepositorio,
  ) {}

  async ejecutar(pacienteId: string, pregunta: string): Promise<RespuestaAsistente> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const [objetivos, planActivo] = await Promise.all([
      this.objetivos.listarPorPaciente(pacienteId),
      this.planes.obtenerPlanActivoDePaciente(pacienteId),
    ]);

    const respuesta = await this.asistente.responder(pregunta, {
      nombrePaciente: paciente.nombreCompleto,
      objetivos: objetivos
        .map((o) => o.aPrimitivos())
        .filter((o) => o.estado === "EN_CURSO")
        .map((o) => o.titulo),
      tienePlan: planActivo != null,
    });

    await this.historial.guardarConsulta(
      ConsultaIA.crear({ pacienteId, pregunta, respuesta }, crypto.randomUUID()),
    );

    return { pregunta, respuesta };
  }
}
