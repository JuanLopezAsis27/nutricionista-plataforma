import { formatearFechaCorta } from "@/dominio/casos-de-uso/secretaria/variables";

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

/** Reemplaza los placeholders {{clave}} (espacios opcionales) por sus valores. */
export function renderizarPlantillaCliente(
  texto: string,
  variables: Record<string, string> = variablesEjemploCliente(),
): string {
  return Object.entries(variables).reduce((acc, [clave, valor]) => {
    const patron = new RegExp(`{{\\s*${clave}\\s*}}`, "g");
    return acc.replace(patron, valor);
  }, texto);
}
