import type { IPromptIARepositorio } from "@/dominio/repositorios/IPromptIARepositorio";
import type { ClavePromptIA } from "@/dominio/servicios/promptsIA";
import { PROMPTS_IA } from "@/dominio/servicios/promptsIA";
import type { PromptIADto } from "../dtos/promptsIA.dto";

/**
 * System prompts de la IA, para la pantalla de Integraciones.
 *
 * `listar` devuelve SIEMPRE las siete funcionalidades —también las que el
 * consultorio nunca tocó— con su explicación y su texto de fábrica: la
 * pantalla no tiene que saber cuáles existen ni cómo dicen de origen, y el
 * texto de fábrica viaja para poder mostrarlo, compararlo y restablecerlo.
 */
export class ServicioPromptsIA {
  constructor(private readonly repositorio: IPromptIARepositorio) {}

  async listar(): Promise<PromptIADto[]> {
    const propios = await this.repositorio.obtenerTodos();
    return PROMPTS_IA.map((prompt) => ({
      clave: prompt.clave,
      titulo: prompt.titulo,
      donde: prompt.donde,
      audiencia: prompt.audiencia,
      descripcion: prompt.descripcion,
      variables: prompt.variables,
      porDefecto: prompt.porDefecto,
      personalizado: propios[prompt.clave] ?? null,
    }));
  }

  /**
   * Guarda el texto propio, salvo que sea idéntico al de fábrica: ahí se borra
   * la fila. Sin esto, quien pega el texto de fábrica para "volver atrás" se
   * queda con una copia congelada que ya no recibe las mejoras de la app.
   */
  async guardar(clave: ClavePromptIA, texto: string): Promise<void> {
    const limpio = texto.trim();
    const deFabrica = PROMPTS_IA.find((p) => p.clave === clave)?.porDefecto;
    if (limpio === deFabrica?.trim()) {
      await this.repositorio.restablecer(clave);
      return;
    }
    await this.repositorio.guardar(clave, limpio);
  }

  /** Vuelve la funcionalidad al texto de fábrica. */
  restablecer(clave: ClavePromptIA): Promise<void> {
    return this.repositorio.restablecer(clave);
  }
}
