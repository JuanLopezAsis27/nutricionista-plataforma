import type {
  IAsistenteAnalitico,
  TurnoAsistente,
} from "@/dominio/servicios/IAsistenteAnalitico";

/**
 * Stub del asistente analítico del nutricionista: sin IA configurada, responde
 * un mensaje de demostración (no consulta la base). Al cargar una API key en
 * Integraciones, el contenedor usa el adaptador real.
 */
export class AsistenteAnaliticoStub implements IAsistenteAnalitico {
  async responder(mensajes: TurnoAsistente[]): Promise<string> {
    const ultima = mensajes.at(-1)?.texto.trim() ?? "";
    return (
      `Función en preparación (demostración). Cuando actives la IA en Configuración → ` +
      `Integraciones, voy a analizar los datos reales de tu consultorio (pacientes, planes, ` +
      `recetas, turnos) para responder preguntas como: «${ultima}».`
    );
  }
}
