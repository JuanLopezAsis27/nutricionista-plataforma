import type { IPromptIARepositorio } from "@/dominio/repositorios/IPromptIARepositorio";
import type { ClavePromptIA, IPromptsIA } from "@/dominio/servicios/promptsIA";
import {
  aplicarVariables,
  promptPorDefecto,
} from "@/dominio/servicios/promptsIA";

/**
 * Resuelve el system prompt de una funcionalidad POR LLAMADA: el que escribió
 * el consultorio si lo hay, el de fábrica si no, con las variables de esa
 * llamada ya reemplazadas.
 *
 * No cachea entre requests a propósito. Los prompts se editan desde una
 * pantalla y lo que se espera después de guardar es que la próxima respuesta
 * salga distinta; una caché de proceso haría que el cambio apareciera cuando
 * el server decidiera, y en varias instancias, cuando se le ocurriera a cada
 * una. Es una tabla de a lo sumo siete filas leída una vez por llamada al
 * modelo: al lado de la llamada misma, no se nota.
 */
export class ResolvedorPromptsIA implements IPromptsIA {
  constructor(private readonly repositorio: IPromptIARepositorio) {}

  async obtener(
    clave: ClavePromptIA,
    variables: Record<string, string> = {},
  ): Promise<string> {
    let plantilla = promptPorDefecto(clave);
    try {
      const propios = await this.repositorio.obtenerTodos();
      const propio = propios[clave]?.trim();
      if (propio) plantilla = propio;
    } catch {
      // Sin alcance de inquilino (un trabajo del worker) o error de lectura:
      // el texto de fábrica es la degradación correcta. Que no se pueda leer
      // la personalización no es motivo para dejar al paciente sin respuesta.
    }
    return aplicarVariables(plantilla, variables);
  }
}
