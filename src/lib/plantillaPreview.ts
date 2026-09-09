import { formatearFechaCorta } from "@/aplicacion/casos-de-uso/secretaria/variables";
import { escaparHtml } from "@/dominio/plantillas/renderizar";

/**
 * Valores de ejemplo para la vista previa de plantillas en el cliente. Reflejan
 * los mismos placeholders que reemplaza el dominio al enviar.
 */
export function variablesEjemploCliente(): Record<string, string> {
  return {
    paciente: "Juan Pérez",
    fecha: formatearFechaCorta(new Date()),
    hora: "10:00",
    profesional: "Lic. López Asis Nicolás",
  };
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
