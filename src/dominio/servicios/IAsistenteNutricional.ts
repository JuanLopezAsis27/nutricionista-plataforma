/**
 * Contexto del paciente que se le pasa al asistente para fundamentar su
 * respuesta. Lo arma el caso de uso desde los repositorios. Las `restricciones`
 * y `recomendacionesNutricionista` son indicaciones del profesional que el
 * asistente DEBE respetar siempre (van en el prompt como reglas duras).
 */
export interface ContextoAsistente {
  nombrePaciente: string;
  objetivos: string[];
  tienePlan: boolean;
  /** Alergias / intolerancias / restricciones alimentarias del paciente. */
  restricciones: string[];
  /** Recomendaciones/axiomas activos que cargó el nutricionista. */
  recomendacionesNutricionista: string[];
}

/**
 * Una herramienta que el asistente puede invocar para traer datos del paciente
 * desde la DB. La DEFINE el caso de uso (cierra sobre los repositorios); el
 * adaptador solo la expone al modelo y ejecuta `ejecutar` cuando la pide. Así
 * la infraestructura de IA nunca toca Prisma directamente.
 */
export interface HerramientaAsistente {
  nombre: string;
  descripcion: string;
  /** JSON Schema de los argumentos (objeto vacío si no toma argumentos). */
  esquema: Record<string, unknown>;
  ejecutar(args: Record<string, unknown>): Promise<string>;
}

/**
 * Puerto del asistente nutricional (chatbot del paciente). El adaptador con IA
 * corre un loop de herramientas: el modelo pide datos (plan, recetas, etc.) con
 * las `herramientas` y responde fundamentado. Degrada al stub si no hay IA.
 */
export interface IAsistenteNutricional {
  responder(
    pregunta: string,
    contexto: ContextoAsistente,
    herramientas?: HerramientaAsistente[],
  ): Promise<string>;
}
