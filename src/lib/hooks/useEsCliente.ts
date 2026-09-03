"use client";

import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};
const enCliente = () => true;
const enServidor = () => false;

/**
 * `false` en el HTML del servidor y en la hidratación; `true` a partir de ahí.
 *
 * Existe para lo que depende del RELOJ DE QUIEN MIRA —el saludo según la hora,
 * qué día de la semana es hoy—. El servidor no está en la zona horaria del
 * paciente, así que calcularlo durante el render da un HTML que no coincide
 * con el del navegador y React descarta el árbol entero al hidratar.
 *
 * Va con `useSyncExternalStore` y no con un `useState` + `useEffect` porque
 * eso es exactamente lo que hace: leer un valor que difiere entre servidor y
 * cliente, sin el render extra que provoca escribir estado dentro de un efecto.
 */
export function useEsCliente(): boolean {
  return useSyncExternalStore(sinSuscripcion, enCliente, enServidor);
}
