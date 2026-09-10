"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { instalar, useInstalacionPwa } from "@/componentes/pwa/instalacion";

/** Descartado con la ✕: no se ofrece más, nunca. */
const CLAVE_DESCARTADO = "pwa-instalacion-descartada";
/** Ya se mostró en esta visita: no vuelve a asomar al navegar. */
const CLAVE_MOSTRADO = "pwa-instalacion-mostrada";

/** Cuánto tarda en asomar, para no tapar la pantalla apenas carga. */
const MS_DEMORA = 2_000;
/** Cuánto queda a la vista antes de irse solo. */
const MS_VISIBLE = 10_000;

/**
 * Aviso que ofrece instalar la app como acceso directo.
 *
 * Aparece **una sola vez por visita**, se va solo a los diez segundos y se
 * puede descartar para siempre con la ✕. Quien lo deje pasar tiene el botón
 * del header (`BotonInstalarHeader`), que es el que está siempre disponible;
 * este cartel es el empujón inicial, no la única puerta.
 *
 * La marca de «ya se mostró» va en `sessionStorage` y no en el estado del
 * componente porque no alcanza con que el layout no se vuelva a montar: entre
 * el login y el panel, y en cualquier navegación que rehaga el documento, el
 * componente arranca de cero y el cartel volvía a aparecer.
 *
 * **Por qué existe si Chrome ya ofrece instalar.** Lo ofrece en un ícono chico
 * dentro de la barra de direcciones que nadie mira. Y en iPhone directamente no
 * lo ofrece: Safari no implementa `beforeinstallprompt`, y la única forma es
 * Compartir → «Agregar a inicio». De ahí las dos variantes del cartel.
 */
export function BotonInstalarApp() {
  const { sePuedeInstalar, esIos } = useInstalacionPwa();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sePuedeInstalar) return;
    if (localStorage.getItem(CLAVE_DESCARTADO) === "1") return;
    if (sessionStorage.getItem(CLAVE_MOSTRADO) === "1") return;

    const temporizador = setTimeout(() => {
      // Se marca al mostrarlo y no al ocultarlo: si la persona navega en esos
      // diez segundos, el cartel ya cumplió y no tiene que volver.
      sessionStorage.setItem(CLAVE_MOSTRADO, "1");
      setVisible(true);
    }, MS_DEMORA);
    return () => clearTimeout(temporizador);
  }, [sePuedeInstalar]);

  useEffect(() => {
    if (!visible) return;
    const temporizador = setTimeout(() => setVisible(false), MS_VISIBLE);
    return () => clearTimeout(temporizador);
  }, [visible]);

  function descartar() {
    localStorage.setItem(CLAVE_DESCARTADO, "1");
    setVisible(false);
  }

  async function alInstalar() {
    await instalar();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar la aplicación"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-xl border bg-card p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:left-auto"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Download className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium leading-tight">
          Instalá la app en tu dispositivo
        </p>

        {esIos ? (
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            Tocá
            <Share className="inline h-3.5 w-3.5" aria-label="Compartir" />
            <span>Compartir</span>y después
            <SquarePlus className="inline h-3.5 w-3.5" aria-hidden />
            <span>&laquo;Agregar a inicio&raquo;.</span>
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Se abre en su propia ventana, sin barra del navegador, y queda con
              su acceso directo.
            </p>
            <Button size="sm" onClick={alInstalar}>
              Instalar
            </Button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={descartar}
        aria-label="No mostrar más"
        className="-mt-1 -mr-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
