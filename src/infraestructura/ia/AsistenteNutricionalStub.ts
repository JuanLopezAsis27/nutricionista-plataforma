import type {
  IAsistenteNutricional,
  ContextoAsistente,
} from "@/dominio/servicios/IAsistenteNutricional";

/**
 * Adaptador STUB del asistente nutricional. Devuelve una respuesta de
 * demostración fundamentada en el contexto real del paciente (nombre,
 * objetivos, si tiene plan), pero aclarando que la IA todavía no está activa.
 *
 * A futuro se reemplaza por un adaptador que llama a la API de Claude
 * (Messages) con el mismo contexto; la UI y los casos de uso no cambian.
 */
export class AsistenteNutricionalStub implements IAsistenteNutricional {
  async responder(
    pregunta: string,
    contexto: ContextoAsistente,
  ): Promise<string> {
    const objetivos =
      contexto.objetivos.length > 0
        ? `Tus objetivos actuales: ${contexto.objetivos.join(", ")}.`
        : "Todavía no tenés objetivos cargados.";
    const plan = contexto.tienePlan
      ? "Tenés un plan activo asignado."
      : "Aún no tenés un plan activo.";

    return (
      `Hola ${contexto.nombrePaciente}. Soy tu asistente (versión de demostración).\n\n` +
      `Cuando esté activo, voy a responder tu consulta —"${pregunta.trim()}"— usando tu ` +
      `plan, tus objetivos y tu diario.\n\n` +
      `${plan} ${objetivos}\n\n` +
      `Por ahora, ante cualquier duda importante escribile a tu nutricionista desde Mensajes.`
    );
  }
}
