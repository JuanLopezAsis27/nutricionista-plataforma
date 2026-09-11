import { variablesEjemplo } from "@/aplicacion/casos-de-uso/secretaria/variables";
import { escaparHtml } from "@/dominio/plantillas/renderizar";

/**
 * Valores de ejemplo para la vista previa de una plantilla en el cliente.
 *
 * Son los mismos del email de prueba (`variablesEjemplo`), que a su vez
 * reflejan lo que reemplaza cada envío real según la plantilla: la bienvenida
 * sus datos de acceso, el recordatorio su turno. Tener una lista propia acá
 * era dejar que la vista previa y el envío divergieran sin que nadie lo note.
 */
export function variablesEjemploCliente(
  clavePlantilla?: string,
): Record<string, string> {
  return variablesEjemplo(
    "Lic. López Asis Nicolás",
    new Date(),
    clavePlantilla,
  );
}

/**
 * Reemplaza los placeholders {{clave}} (espacios opcionales) por sus valores.
 *
 * Para destinos de texto plano (el asunto). Para la vista previa del cuerpo,
 * que se inyecta con `dangerouslySetInnerHTML`, usar `renderizarHtmlCliente`.
 */
export function renderizarPlantillaCliente(
  texto: string,
  variables: Record<string, string> = variablesEjemploCliente(),
): string {
  return Object.entries(variables).reduce((acc, [clave, valor]) => {
    const patron = new RegExp(`{{\\s*${clave}\\s*}}`, "g");
    return acc.replace(patron, valor);
  }, texto);
}

/**
 * Igual, pero escapando los valores: es la que corresponde cuando el resultado
 * va a `dangerouslySetInnerHTML`.
 *
 * Espeja a `renderizarPlantillaHtml` del dominio a propósito. Si la vista
 * previa escapara distinto que el envío real, mostraría algo que no es lo que
 * le va a llegar al paciente — y la vista previa existe justamente para que lo
 * que se ve sea lo que se manda.
 */
export function renderizarHtmlCliente(
  html: string,
  variables: Record<string, string> = variablesEjemploCliente(),
): string {
  return Object.entries(variables).reduce((acc, [clave, valor]) => {
    const patron = new RegExp(`{{\\s*${clave}\\s*}}`, "g");
    return acc.replace(patron, escaparHtml(valor));
  }, html);
}
