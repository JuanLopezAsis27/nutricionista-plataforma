import type {
  IAsistenteAnalitico,
  TurnoAsistente,
} from "@/dominio/servicios/IAsistenteAnalitico";
import type { HerramientaAsistente } from "@/dominio/servicios/IAsistenteNutricional";
import type { IResolvedorConfigIA } from "./ResolvedorConfigIA";
import type { AlAvanzarIA } from "@/dominio/servicios/avanceIA";
import { comoErrorIA } from "@/dominio/errores/ErrorIA";
import type { IPromptsIA } from "@/dominio/servicios/promptsIA";
import { PromptsIAPorDefecto } from "@/dominio/servicios/promptsIA";

/**
 * El system prompt sale del catálogo (o de lo que haya escrito el consultorio
 * en Integraciones → IA), y la app le inyecta la fecha de hoy.
 *
 * Un modelo NO sabe qué día es. Sin eso no podía responder «¿qué turnos tengo
 * hoy?» por más que la herramienta le devolviera los turnos con su fecha: no
 * tenía contra qué compararlas, y contestaba que no había ninguno.
 */
function variablesDeFecha(ahora: Date): Record<string, string> {
  return {
    fecha: ahora.toISOString().slice(0, 10),
    diaSemana: new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      timeZone: "UTC",
    }).format(ahora),
  };
}

/**
 * Adaptador del asistente analítico del nutricionista (Claude/OpenRouter, según
 * la config del profesional). Resuelve el proveedor por request y corre el loop
 * de herramientas.
 *
 * Degrada al stub SOLO si no hay IA configurada. Si la hay y la llamada falla,
 * el error se propaga: antes cualquier excepción se tragaba y se devolvía el
 * texto de demostración, así que un 401 o un timeout llegaban a la pantalla
 * disfrazados de respuesta y el profesional no tenía cómo saber que la IA no
 * había contestado nada.
 */
export class AsistenteAnaliticoClaude implements IAsistenteAnalitico {
  constructor(
    private readonly resolver: IResolvedorConfigIA,
    private readonly respaldo: IAsistenteAnalitico,
    private readonly prompts: IPromptsIA = new PromptsIAPorDefecto(),
  ) {}

  async responder(
    mensajes: TurnoAsistente[],
    herramientas: HerramientaAsistente[],
    ahora: Date,
    alAvanzar?: AlAvanzarIA,
  ): Promise<string> {
    const llm = await this.resolver.obtenerLLM();
    if (!llm) return this.respaldo.responder(mensajes, herramientas, ahora);

    const porNombre = new Map(herramientas.map((h) => [h.nombre, h]));
    let texto: string;
    try {
      texto = await llm.conversar({
        system: await this.prompts.obtener(
          "ASISTENTE_ANALITICO",
          variablesDeFecha(ahora),
        ),
        mensajes: mensajes.map((m) => ({ rol: m.rol, texto: m.texto.trim() })),
        maxTokens: 4096,
        // Analizar de verdad requiere encadenar herramientas (ubicar al
        // paciente, traer su plan, mirar la agenda); con esfuerzo bajo el
        // modelo contesta con la primera que llama.
        esfuerzo: "medio",
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
        maxIteraciones: 8,
        alAvanzar,
      });
    } catch (error) {
      throw comoErrorIA("El análisis con IA", error);
    }

    if (!texto) {
      throw new Error(
        "La IA no devolvió ninguna respuesta. Probá de nuevo o revisá la configuración en Integraciones.",
      );
    }
    return texto;
  }
}
