import type { HerramientaAsistente } from "./IAsistenteNutricional";

/** Un turno ya dicho en la conversación con el asistente. */
export interface TurnoAsistente {
  rol: "usuario" | "asistente";
  texto: string;
}

/**
 * Puerto del asistente analítico del NUTRICIONISTA. A diferencia del asistente
 * del paciente, no está atado a un paciente: responde preguntas sobre el
 * consultorio (pacientes, planes, recetas, turnos) usando `herramientas` que
 * leen la base. El adaptador corre el loop de tool-calling; degrada al stub si
 * no hay IA configurada.
 */
export interface IAsistenteAnalitico {
  /**
   * @param mensajes la conversación completa, terminando en la pregunta nueva.
   *   Antes era un único string y por eso el asistente no recordaba nada.
   * @param ahora fecha de la consulta. Va explícita porque un modelo NO sabe
   *   qué día es: sin esto no podía contestar "¿qué turnos tengo hoy?" aunque
   *   la herramienta le devolviera los turnos correctos.
   */
  responder(
    mensajes: TurnoAsistente[],
    herramientas: HerramientaAsistente[],
    ahora: Date,
  ): Promise<string>;
}
