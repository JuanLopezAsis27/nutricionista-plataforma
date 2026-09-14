"use client";

import { toast } from "sonner";

/**
 * El único lugar por donde un error se convierte en algo que el usuario ve.
 *
 * Antes cada hook hacía `toast.error(error.message)`, y eso confía en que el
 * `message` sea presentable. No siempre lo era: la validación de un lote
 * llegaba como el `JSON.stringify` de los issues de Zod y el toast ocupaba
 * media pantalla (hoy el servidor ya lo traduce —ver `servidor/mensajeZod.ts`—
 * pero esta es la red que atrapa lo que venga de otro lado: un `fetch` suelto,
 * una librería, un error de red del navegador).
 *
 * Dos reglas, que son las dos mitades del pedido "más explicativo y menos
 * invasivo":
 *
 * - **Nunca un volcado.** Lo que parece JSON o rastro de pila no se muestra:
 *   no dice nada que el usuario pueda usar y tapa la pantalla.
 * - **Nunca más largo que un toast.** Se corta en `MAXIMO` caracteres. Un
 *   mensaje que no entra no se lee, y el detalle completo ya está en el
 *   monitor del servidor.
 */

/** Lo más largo que puede ser un toast sin volverse un cartel. */
const MAXIMO = 220;

const GENERICO = "No se pudo completar la acción. Revisá los datos cargados.";

/** ¿Esto es un volcado técnico y no una frase? */
function esVolcado(mensaje: string): boolean {
  const limpio = mensaje.trim();
  return (
    limpio.startsWith("[{") ||
    limpio.startsWith("{") ||
    limpio.startsWith("[\n") ||
    limpio.includes('"code":') ||
    limpio.includes("    at ")
  );
}

/**
 * El texto que corresponde mostrar para un error, venga de donde venga.
 *
 * `respaldo` es lo que se dice cuando el error no trae nada presentable: lo
 * usan los llamadores que saben qué se estaba intentando («No se pudo subir la
 * foto») y pueden decirlo mejor que el genérico.
 */
export function mensajeDeError(error: unknown, respaldo?: string): string {
  const crudo =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string"
          ? (error as { message: string }).message
          : "";

  const mensaje = crudo.trim();
  if (!mensaje || esVolcado(mensaje)) return respaldo ?? GENERICO;
  return mensaje.length > MAXIMO
    ? `${mensaje.slice(0, MAXIMO - 1).trimEnd()}…`
    : mensaje;
}

/**
 * Avisa de un error al usuario.
 *
 * Dura 7 segundos y no 4 como el resto de los toasts: un error hay que
 * alcanzar a leerlo, y a diferencia de un "guardado" no se puede deducir de lo
 * que quedó en pantalla.
 */
export function avisarError(error: unknown, respaldo?: string): void {
  toast.error(mensajeDeError(error, respaldo), { duration: 7000 });
}
