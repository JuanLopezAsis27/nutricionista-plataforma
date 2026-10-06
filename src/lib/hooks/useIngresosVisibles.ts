"use client";

import { useCallback, useSyncExternalStore } from "react";
import { formatearMoneda } from "@/lib/formato";

const CLAVE = "nutricrm:ingresos-visibles";
/** Aviso a los otros componentes de la MISMA pestaña (`storage` solo llega a las demás). */
const EVENTO = "ingresos-visibles";
const OCULTO = "$ ******";

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== "0";
  } catch {
    return true;
  }
}

function suscribir(avisar: () => void): () => void {
  window.addEventListener("storage", avisar);
  window.addEventListener(EVENTO, avisar);
  return () => {
    window.removeEventListener("storage", avisar);
    window.removeEventListener(EVENTO, avisar);
  };
}

// En el servidor (y en la hidratación) los montos salen ocultos: si la
// preferencia es ocultarlos, nunca se llegan a ver ni por un instante.
const enServidor = (): boolean => false;

export interface IngresosVisibles {
  visibles: boolean;
  alternar: () => void;
  /** El monto formateado, o `$ ******` si están ocultos. */
  monto: (valor: number | null | undefined) => string;
}

/**
 * Mostrar u ocultar los montos de plata (dashboard y estadísticas).
 *
 * Es una preferencia de QUIEN MIRA, no del consultorio: sirve para abrir la app
 * con un paciente al lado sin exponerle la facturación. Por eso vive en el
 * dispositivo (localStorage) y no en la base, y es UNA sola para las dos
 * pantallas: ocultar en una y encontrarla a la vista en la otra no protege nada.
 */
export function useIngresosVisibles(): IngresosVisibles {
  const visibles = useSyncExternalStore(suscribir, leer, enServidor);

  const alternar = useCallback(() => {
    try {
      localStorage.setItem(CLAVE, leer() ? "0" : "1");
    } catch {
      // Sin almacenamiento (navegación privada) la preferencia no se guarda.
    }
    window.dispatchEvent(new Event(EVENTO));
  }, []);

  const monto = useCallback(
    (valor: number | null | undefined): string =>
      visibles ? formatearMoneda(valor) : OCULTO,
    [visibles],
  );

  return { visibles, alternar, monto };
}
