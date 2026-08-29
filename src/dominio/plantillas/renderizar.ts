/**
 * Sustitución de placeholders compartida por todas las plantillas del dominio
 * (email y WhatsApp), para que el vocabulario {{paciente}}, {{fecha}}… se
 * comporte igual en los dos canales.
 *
 * Vive fuera de `entidades` y de `casos-de-uso` porque las dos capas la usan.
 */

/**
 * Reemplaza los placeholders {{clave}} (con espacios opcionales) por sus
 * valores. Los placeholders sin valor quedan intactos, para que el error se
 * vea en la vista previa en vez de producir un texto mutilado.
 *
 * Esta versión NO escapa nada: es la correcta para destinos de texto plano
 * (WhatsApp, la parte `text` del email). Para HTML usar `renderizarPlantillaHtml`.
 */
export function renderizarPlantilla(
  texto: string,
  variables: Record<string, string>,
): string {
  return Object.entries(variables).reduce((acc, [clave, valor]) => {
    const patron = new RegExp(`{{\\s*${clave}\\s*}}`, "g");
    return acc.replace(patron, valor);
  }, texto);
}

/** Escapa los caracteres con significado en HTML. */
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Igual que `renderizarPlantilla`, pero escapando los VALORES antes de
 * insertarlos.
 *
 * La distinción importa por dónde vienen las dos mitades. El HTML de la
 * plantilla lo escribe el profesional: es contenido de confianza y se respeta
 * tal cual, incluidas sus etiquetas. Los valores que se sustituyen, en cambio,
 * son datos —el nombre del paciente, sobre todo— y un nombre no tiene ninguna
 * razón para contener etiquetas.
 *
 * Sin este escapado, un nombre con `<script>` o con un atributo `onerror` se
 * inyectaba tal cual en el cuerpo del correo que sale hacia terceros, y en la
 * vista previa que el profesional abre en su propio dashboard.
 */
export function renderizarPlantillaHtml(
  html: string,
  variables: Record<string, string>,
): string {
  return Object.entries(variables).reduce((acc, [clave, valor]) => {
    const patron = new RegExp(`{{\\s*${clave}\\s*}}`, "g");
    return acc.replace(patron, escaparHtml(valor));
  }, html);
}
