import type { IPromptIARepositorio } from "@/dominio/repositorios/IPromptIARepositorio";
import { ServicioPromptsIA } from "@/aplicacion/servicios/ServicioPromptsIA";

/** Arma el servicio de system prompts personalizables de la IA. */
export function crearServicioPromptsIA(deps: {
  prompts: IPromptIARepositorio;
}): ServicioPromptsIA {
  return new ServicioPromptsIA(deps.prompts);
}
