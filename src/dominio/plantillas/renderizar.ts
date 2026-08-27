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
 */
export function renderizarPlantilla(texto: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce((acc, [clave, valor]) => {
    const patron = new RegExp(`{{\\s*${clave}\\s*}}`, "g");
    return acc.replace(patron, valor);
  }, texto);
}
