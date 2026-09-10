"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado compartido de «se puede instalar la app».
 *
 * Vive en un módulo y no en cada componente porque `beforeinstallprompt` se
 * dispara UNA sola vez por carga, y bastante temprano: un componente que se
 * monte después —el botón del header, que aparece recién cuando hay sesión— se
 * lo perdería si escuchara por su cuenta. Acá el evento se atrapa al importar
 * el módulo y queda guardado para el que pregunte.
 *
 * Ver `docs/PWA.md`.
 */

/**
 * Evento propietario de Chrome/Edge: no está en lib.dom, por eso el tipo va acá.
 * Es lo que permite ofrecer «Instalar» desde la propia interfaz en vez de
 * depender del ícono escondido de la barra de direcciones.
 */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface EstadoInstalacion {
  /** El evento diferido; `null` si el navegador todavía no lo dio o no lo da. */
  evento: EventoInstalacion | null;
  /** Ya está corriendo instalada: ventana propia o WebView de Capacitor. */
  enModoApp: boolean;
  /** Safari en iOS: no hay evento posible, solo instrucciones. */
  esIos: boolean;
}

const ESTADO_SERVIDOR: EstadoInstalacion = {
  evento: null,
  enModoApp: false,
  esIos: false,
};

let estado: EstadoInstalacion = ESTADO_SERVIDOR;
const suscriptores = new Set<() => void>();

function emitir(nuevo: EstadoInstalacion): void {
  estado = nuevo;
  for (const avisar of suscriptores) avisar();
}

/** ¿La app ya está corriendo instalada, en su propia ventana? */
function detectarModoApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari en iOS no implementa `display-mode` y usa esta propiedad suya.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true ||
    // Dentro del WebView de Capacitor (la app de las tiendas, ver
    // `docs/MOBILE.md`) ya se está en una app instalada. Sin esta rama el
    // cartel de iOS aparecía ahí: el user agent del WebView dice iPhone y
    // `navigator.standalone` no está definido, así que pasaba los dos filtros
    // y ofrecía «agregar a inicio» adentro de la app nativa.
    "Capacitor" in window
  );
}

function detectarIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * Se ejecuta al importar el módulo, no dentro de un efecto: hay que estar
 * escuchando antes de que el navegador dispare el evento.
 */
function inicializar(): void {
  if (typeof window === "undefined") return;

  estado = {
    evento: null,
    enModoApp: detectarModoApp(),
    esIos: detectarIos(),
  };

  window.addEventListener("beforeinstallprompt", (evento) => {
    // Sin esto, Chrome muestra su propio mini-infobar y la interfaz propia sobra.
    evento.preventDefault();
    emitir({ ...estado, evento: evento as EventoInstalacion });
  });

  window.addEventListener("appinstalled", () => {
    emitir({ ...estado, evento: null, enModoApp: true });
  });
}

inicializar();

function suscribir(alCambiar: () => void): () => void {
  suscriptores.add(alCambiar);
  return () => suscriptores.delete(alCambiar);
}

function leer(): EstadoInstalacion {
  return estado;
}

function leerEnServidor(): EstadoInstalacion {
  return ESTADO_SERVIDOR;
}

export interface Instalacion {
  /** Hay algo que ofrecer: o el evento del navegador, o las instrucciones de iOS. */
  sePuedeInstalar: boolean;
  /** En iOS no hay botón posible; solo se puede explicar cómo se hace. */
  esIos: boolean;
}

/**
 * Estado de instalación para la interfaz.
 *
 * `useSyncExternalStore` y no `useState` + efecto: en el servidor no se sabe
 * nada de esto, y es la única forma de que el primer render del cliente
 * coincida con el del servidor sin ensuciar el árbol con un `montado`.
 */
export function useInstalacionPwa(): Instalacion {
  const actual = useSyncExternalStore(suscribir, leer, leerEnServidor);
  return {
    sePuedeInstalar:
      !actual.enModoApp && (actual.evento !== null || actual.esIos),
    esIos: actual.esIos,
  };
}

/**
 * Abre el diálogo de instalación del navegador.
 *
 * Devuelve `"no-disponible"` en iOS y en cualquier navegador que no dé el
 * evento; ahí el llamador tiene que explicar el camino a mano.
 */
export async function instalar(): Promise<
  "accepted" | "dismissed" | "no-disponible"
> {
  const { evento } = estado;
  if (!evento) return "no-disponible";

  await evento.prompt();
  const { outcome } = await evento.userChoice;
  // El evento es de un solo uso: el navegador no lo vuelve a entregar en esta
  // carga, así que se descarta pase lo que pase para no dejar un botón muerto.
  emitir({ ...estado, evento: null });
  return outcome;
}

/** El texto de iOS, en un solo lugar: lo usan el cartel y el botón del header. */
export const INSTRUCCION_IOS =
  "Tocá Compartir en la barra de Safari y elegí «Agregar a inicio».";
