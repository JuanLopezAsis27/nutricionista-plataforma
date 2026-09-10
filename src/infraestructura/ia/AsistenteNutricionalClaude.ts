import type {
  IAsistenteNutricional,
  ContextoAsistente,
  HerramientaAsistente,
} from "@/dominio/servicios/IAsistenteNutricional";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import type { AlAvanzarIA } from "@/dominio/servicios/avanceIA";
import { comoErrorIA } from "@/dominio/errores/ErrorIA";

/**
 * Adaptador del asistente nutricional con IA (Claude directo u OpenRouter, según
 * lo que configuró el profesional). Resuelve el proveedor POR REQUEST y corre un
 * loop de herramientas: el modelo pide datos del paciente (plan, recetas,
 * objetivos, restricciones) para responder fundamentado.
 *
 * Degrada al stub SOLO si no hay clave configurada. Si la hay y la llamada
 * falla, el error se propaga (mismo criterio que `AsistenteAnaliticoClaude`):
 * antes cualquier excepción se tragaba y el paciente recibía el texto de
 * demostración como si fuera la respuesta del asistente, sin que ni él ni el
 * profesional tuvieran forma de notar que la IA no había contestado.
 */
export class AsistenteNutricionalClaude implements IAsistenteNutricional {
  constructor(
    private readonly resolver: IResolvedorConfigIA,
    private readonly respaldo: IAsistenteNutricional,
  ) {}

  async responder(
    pregunta: string,
    contexto: ContextoAsistente,
    herramientas: HerramientaAsistente[] = [],
    previos: { rol: "usuario" | "asistente"; texto: string }[] = [],
    alAvanzar?: AlAvanzarIA,
  ): Promise<string> {
    const llm = await this.resolver.obtenerLLM();
    if (!llm) return this.respaldo.responder(pregunta, contexto, herramientas);

    const porNombre = new Map(herramientas.map((h) => [h.nombre, h]));
    let texto: string;
    try {
      texto = await llm.conversar({
        system: construirPrompt(contexto),
        mensajes: [
          ...previos,
          { rol: "usuario" as const, texto: pregunta.trim() },
        ],
        maxTokens: 2048,
        herramientas: herramientas.map((h) => ({
          nombre: h.nombre,
          descripcion: h.descripcion,
          esquema: h.esquema,
        })),
        ejecutar: async (nombre, args) => {
          const herramienta = porNombre.get(nombre);
          if (!herramienta) return `No existe la herramienta "${nombre}".`;
          return herramienta.ejecutar(args);
        },
        alAvanzar,
      });
    } catch (error) {
      throw comoErrorIA("La respuesta del asistente", error);
    }
    // Una respuesta vacía no es un fallo del proveedor (el modelo puede cortar
    // sin decir nada): ahí sí vale el stub antes que dejar el chat en blanco.
    return texto || this.respaldo.responder(pregunta, contexto, herramientas);
  }
}

/** Arma el system prompt fundamentando la respuesta en el contexto del paciente. */
function construirPrompt(contexto: ContextoAsistente): string {
  const objetivos =
    contexto.objetivos.length > 0
      ? contexto.objetivos.join(", ")
      : "ninguno cargado";
  const plan = contexto.tienePlan
    ? "sí (usá la herramienta para ver el detalle)"
    : "no";
  const restricciones =
    contexto.restricciones.length > 0
      ? contexto.restricciones.join("; ")
      : "ninguna registrada";
  const recomendaciones =
    contexto.recomendacionesNutricionista.length > 0
      ? contexto.recomendacionesNutricionista.map((r) => `  • ${r}`).join("\n")
      : "  • (ninguna cargada)";

  return [
    `Sos el asistente nutricional de la app de un consultorio, hablando con el/la paciente ${contexto.nombrePaciente}.`,
    "",
    "Contexto del paciente:",
    `- Objetivos en curso: ${objetivos}`,
    `- Plan activo asignado: ${plan}`,
    `- Restricciones alimentarias (alergias/intolerancias): ${restricciones}`,
    "",
    "Indicaciones del nutricionista (SON REGLAS: nunca las contradigas):",
    recomendaciones,
    "",
    "Herramientas: tenés herramientas para consultar los datos reales del paciente",
    "(su plan, sus recetas asignadas, sus objetivos y sus restricciones). USALAS cuando",
    "la pregunta sea sobre su plan, comidas o recetas, en vez de inventar o generalizar.",
    "",
    "Reglas de conducta:",
    "- Respondé en español rioplatense, claro, cálido y breve.",
    "- RESPETÁ SIEMPRE las restricciones alimentarias: nunca sugieras algo que las viole.",
    "- No das diagnósticos médicos ni indicás medicación, y no cambiás el plan del paciente.",
    "- Toda estimación (calorías, cantidades) aclarala como aproximada, no como un valor exacto.",
    "- Para decisiones clínicas o cambios de plan, indicá que consulte con su nutricionista",
    "  (puede escribirle desde la sección Mensajes).",
    "- Si preguntan algo ajeno a la nutrición/hábitos, redirigí amablemente. Ante una urgencia",
    "  médica, indicá consultar a un profesional de inmediato.",
  ].join("\n");
}
