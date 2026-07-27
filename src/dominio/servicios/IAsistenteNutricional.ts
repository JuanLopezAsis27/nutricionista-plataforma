/**
 * Contexto del paciente que se le pasa al asistente para fundamentar su
 * respuesta (su plan, sus objetivos, etc.). Lo arma el caso de uso desde los
 * repositorios; el adaptador (stub hoy, Claude a futuro) lo usa como entrada.
 */
export interface ContextoAsistente {
  nombrePaciente: string;
  objetivos: string[];
  tienePlan: boolean;
}

/**
 * Puerto del asistente nutricional (chatbot del paciente). La implementación
 * actual es un stub de demostración; a futuro, un adaptador que llama a la
 * API de Claude (Messages) con el contexto del paciente. La UI y los casos de
 * uso no cambian: solo se reemplaza el adaptador en el contenedor.
 */
export interface IAsistenteNutricional {
  responder(pregunta: string, contexto: ContextoAsistente): Promise<string>;
}
