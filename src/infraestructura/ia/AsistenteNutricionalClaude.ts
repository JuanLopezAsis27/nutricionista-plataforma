import type {
  IAsistenteNutricional,
  ContextoAsistente,
  HerramientaAsistente,
} from "@/dominio/servicios/IAsistenteNutricional";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import type { AlAvanzarIA } from "@/dominio/servicios/avanceIA";
import { comoErrorIA } from "@/dominio/errores/ErrorIA";
import type { IPromptsIA } from "@/dominio/servicios/promptsIA";
import { PromptsIAPorDefecto } from "@/dominio/servicios/promptsIA";

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
    private readonly prompts: IPromptsIA = new PromptsIAPorDefecto(),
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
        system: await this.prompts.obtener(
          "ASISTENTE_PACIENTE",
          variablesDelPaciente(contexto),
        ),
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

/**
 * Los datos de ESE paciente, para los `{{marcadores}}` del system prompt.
 *
 * El prompt en sí sale del catálogo (o de lo que haya escrito el consultorio en
 * Integraciones → IA); lo que se arma acá es el contexto que lo funda: sin
 * esto el asistente le contestaría a cualquiera lo mismo, sin saber sus
 * objetivos ni —lo que importa de verdad— sus alergias.
 */
function variablesDelPaciente(
  contexto: ContextoAsistente,
): Record<string, string> {
  return {
    nombrePaciente: contexto.nombrePaciente,
    objetivos:
      contexto.objetivos.length > 0
        ? contexto.objetivos.join(", ")
        : "ninguno cargado",
    plan: contexto.tienePlan
      ? "sí (usá la herramienta para ver el detalle)"
      : "no",
    restricciones:
      contexto.restricciones.length > 0
        ? contexto.restricciones.join("; ")
        : "ninguna registrada",
    recomendaciones:
      contexto.recomendacionesNutricionista.length > 0
        ? contexto.recomendacionesNutricionista
            .map((r) => `  • ${r}`)
            .join("\n")
        : "  • (ninguna cargada)",
  };
}
