import type { HerramientaAsistente } from "./IAsistenteNutricional";

/**
 * Puerto del asistente analítico del NUTRICIONISTA. A diferencia del asistente
 * del paciente, no está atado a un paciente: responde preguntas sobre el
 * consultorio (pacientes, planes, recetas, turnos) usando `herramientas` que
 * leen la base. El adaptador corre el loop de tool-calling; degrada al stub si
 * no hay IA configurada.
 */
export interface IAsistenteAnalitico {
  responder(pregunta: string, herramientas: HerramientaAsistente[]): Promise<string>;
}
