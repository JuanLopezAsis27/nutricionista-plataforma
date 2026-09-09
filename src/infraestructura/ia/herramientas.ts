/**
 * Utilidades compartidas del loop de herramientas (tool-calling). El proveedor
 * LLM llama al ejecutor que le pasa el adaptador; si una herramienta falla, no
 * se cae toda la conversación: se devuelve un mensaje de error que el modelo lee.
 */
export async function ejecutarHerramientaSegura(
  ejecutar: (nombre: string, args: Record<string, unknown>) => Promise<string>,
  nombre: string,
  args: unknown,
): Promise<string> {
  try {
    const argumentos =
      args && typeof args === "object" ? (args as Record<string, unknown>) : {};
    const salida = await ejecutar(nombre, argumentos);
    return salida.trim() === "" ? "(sin datos)" : salida;
  } catch {
    return `No se pudo obtener "${nombre}" en este momento.`;
  }
}

/** Parsea de forma segura los argumentos JSON de una tool-call de OpenAI. */
export function parsearArgumentos(
  crudo: string | undefined,
): Record<string, unknown> {
  if (!crudo || crudo.trim() === "") return {};
  try {
    const v: unknown = JSON.parse(crudo);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
